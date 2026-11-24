from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

import httpx
import pytest
from fastapi import FastAPI

from app.main import create_app


@asynccontextmanager
async def client_for(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            yield client


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_hierarchy_crud_order_validation_cascade_and_restart(tmp_path: Path) -> None:
    app = create_app(tmp_path / "user-data")
    async with client_for(app) as client:
        project = await client.post("/api/v1/projects", json={"name": "Estoicismo", "description": "Estudo"})
        assert project.status_code == 201
        project_id = project.json()["id"]
        discipline = await client.post(f"/api/v1/projects/{project_id}/disciplines", json={"name": "Filosofia"})
        discipline_id = discipline.json()["id"]
        discipline_2 = (await client.post(f"/api/v1/projects/{project_id}/disciplines", json={"name": "História"})).json()
        subject = await client.post(f"/api/v1/disciplines/{discipline_id}/subjects", json={"name": "Estoicismo antigo"})
        subject_id = subject.json()["id"]
        subject_2 = (await client.post(f"/api/v1/disciplines/{discipline_id}/subjects", json={"name": "Estoicismo romano"})).json()
        topic = await client.post(f"/api/v1/subjects/{subject_id}/topics", json={"name": "Virtude"})
        topic_id = topic.json()["id"]
        topic_2 = (await client.post(f"/api/v1/subjects/{subject_id}/topics", json={"name": "Autodomínio"})).json()
        assert (await client.put(f"/api/v1/disciplines/{discipline_id}/subjects/order", json={"ids": [subject_2["id"], subject_id]})).status_code == 200
        assert (await client.put(f"/api/v1/subjects/{subject_id}/topics/order", json={"ids": [topic_2["id"], topic_id]})).status_code == 200
        hierarchy = (await client.get(f"/api/v1/projects/{project_id}")).json()
        assert hierarchy["disciplines"], hierarchy
        stored_discipline = next(item for item in hierarchy["disciplines"] if item["id"] == discipline_id)
        stored_subject = next(item for item in stored_discipline["subjects"] if item["id"] == subject_id)
        assert [topic["name"] for topic in stored_subject["topics"]] == ["Autodomínio", "Virtude"]
        assert (await client.patch(f"/api/v1/projects/{project_id}", json={"name": "Estoicismo clássico"})).status_code == 200
        assert (await client.patch(f"/api/v1/disciplines/{discipline_id}", json={"name": "Filosofia antiga", "position": 0})).status_code == 200
        assert (await client.patch(f"/api/v1/subjects/{subject_id}", json={"name": "Escolas helenísticas", "position": 0})).status_code == 200
        assert (await client.patch(f"/api/v1/topics/{topic_id}", json={"name": "Sabedoria", "position": 0})).status_code == 200
        assert (await client.put(f"/api/v1/disciplines/{discipline_id}/subjects/order", json={"ids": [subject_2["id"], subject_id]})).status_code == 200
        assert (await client.put(f"/api/v1/subjects/{subject_id}/topics/order", json={"ids": [topic_2["id"], topic_id]})).status_code == 200
        assert (await client.put(f"/api/v1/projects/{project_id}/disciplines/order", json={"ids": [discipline_2["id"], discipline_id]})).status_code == 200
        assert (await client.put(f"/api/v1/projects/{project_id}/disciplines/order", json={"ids": [discipline_id]})).status_code == 422
        reordered = (await client.get(f"/api/v1/projects/{project_id}")).json()
        assert [item["id"] for item in reordered["disciplines"]] == [discipline_2["id"], discipline_id]
        updated_discipline = next(item for item in reordered["disciplines"] if item["id"] == discipline_id)
        assert [item["name"] for item in updated_discipline["subjects"]] == ["Estoicismo romano", "Escolas helenísticas"]
        updated_subject = next(item for item in updated_discipline["subjects"] if item["id"] == subject_id)
        assert [item["name"] for item in updated_subject["topics"]] == ["Autodomínio", "Sabedoria"]
        assert (await client.get("/api/v1/projects/9999")).status_code == 404
        assert (await client.post("/api/v1/projects/9999/disciplines", json={"name": "x"})).status_code == 404
        assert (await client.delete(f"/api/v1/topics/{topic_id}")).status_code == 204
        assert (await client.delete(f"/api/v1/topics/{topic_2['id']}")).status_code == 204
        assert (await client.delete(f"/api/v1/subjects/{subject_id}")).status_code == 204
        assert (await client.delete(f"/api/v1/disciplines/{discipline_id}")).status_code == 204
        assert (await client.get(f"/api/v1/projects/{project_id}")).status_code == 200
    async with client_for(create_app(tmp_path / "user-data")) as restarted:
        persisted = (await restarted.get("/api/v1/projects")).json()
        assert persisted[0]["name"] == "Estoicismo clássico"
        assert persisted[0]["disciplines"][0]["name"] == "História"
        assert len(persisted[0]["disciplines"]) == 1
        assert persisted[0]["disciplines"][0]["subjects"] == []
        assert (await restarted.delete(f"/api/v1/projects/{project_id}")).status_code == 204
        assert (await restarted.get(f"/api/v1/projects/{project_id}")).status_code == 404


@pytest.mark.anyio
async def test_validation_rejects_empty_names_and_unknown_fields(tmp_path: Path) -> None:
    async with client_for(create_app(tmp_path)) as client:
        assert (await client.post("/api/v1/projects", json={"name": " "})).status_code == 422
        assert (await client.post("/api/v1/projects", json={"name": "", "admin": True})).status_code == 422
        assert (await client.post("/api/v1/projects/1/disciplines", json={"name": ""})).status_code == 422


@pytest.mark.anyio
async def test_empty_hierarchy_and_project_isolation(tmp_path: Path) -> None:
    async with client_for(create_app(tmp_path)) as client:
        first = (await client.post("/api/v1/projects", json={"name": "Projeto A"})).json()
        second = (await client.post("/api/v1/projects", json={"name": "Projeto B"})).json()
        empty = await client.get(f"/api/v1/projects/{first['id']}")
        assert empty.status_code == 200
        assert empty.json()["disciplines"] == []
        discipline = (await client.post(f"/api/v1/projects/{second['id']}/disciplines", json={"name": "Disciplina B"})).json()
        subject = (await client.post(f"/api/v1/disciplines/{discipline['id']}/subjects", json={"name": "Assunto B"})).json()
        await client.post(f"/api/v1/subjects/{subject['id']}/topics", json={"name": "Tópico B"})
        assert (await client.get(f"/api/v1/projects/{first['id']}")).json()["disciplines"] == []
        assert (await client.get(f"/api/v1/projects/{second['id']}")).json()["disciplines"][0]["subjects"][0]["topics"][0]["name"] == "Tópico B"


@pytest.mark.anyio
async def test_missing_ids_and_parent_deletion_cascade(tmp_path: Path) -> None:
    async with client_for(create_app(tmp_path)) as client:
        project = (await client.post("/api/v1/projects", json={"name": "Cascata"})).json()
        discipline = (await client.post(f"/api/v1/projects/{project['id']}/disciplines", json={"name": "D"})).json()
        subject = (await client.post(f"/api/v1/disciplines/{discipline['id']}/subjects", json={"name": "S"})).json()
        topic = (await client.post(f"/api/v1/subjects/{subject['id']}/topics", json={"name": "T"})).json()

        assert (await client.get("/api/v1/disciplines/9999")).status_code == 404
        assert (await client.get("/api/v1/subjects/9999")).status_code == 404
        assert (await client.get("/api/v1/topics/9999")).status_code == 404
        assert (await client.patch("/api/v1/projects/9999", json={"name": "x"})).status_code == 404
        assert (await client.patch("/api/v1/disciplines/9999", json={"name": "x"})).status_code == 404
        assert (await client.patch("/api/v1/subjects/9999", json={"name": "x"})).status_code == 404
        assert (await client.patch("/api/v1/topics/9999", json={"name": "x"})).status_code == 404
        assert (await client.put(f"/api/v1/subjects/{subject['id']}/topics/order", json={"ids": [9999]})).status_code == 422
        assert (await client.delete(f"/api/v1/disciplines/{discipline['id']}")).status_code == 204
        assert (await client.get(f"/api/v1/subjects/{subject['id']}")).status_code == 404
        assert (await client.get(f"/api/v1/topics/{topic['id']}")).status_code == 404
