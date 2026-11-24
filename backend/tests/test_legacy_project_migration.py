from __future__ import annotations

import sqlite3
from contextlib import asynccontextmanager, closing
from pathlib import Path
from typing import AsyncIterator

import httpx
import pytest
from fastapi import FastAPI

from app.main import create_app


@asynccontextmanager
async def api_client(application: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    async with application.router.lifespan_context(application):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application),
            base_url="http://testserver",
        ) as client:
            yield client


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_startup_adds_missing_project_kind_without_losing_legacy_rows(
    tmp_path: Path,
) -> None:
    data_directory = tmp_path / "legacy-data"
    data_directory.mkdir()
    database_path = data_directory / "revisai.sqlite3"

    # Reproduce the older projects table while preserving an existing project.
    with closing(sqlite3.connect(database_path)) as connection:
        connection.execute(
            """CREATE TABLE projects (
                id INTEGER PRIMARY KEY,
                name VARCHAR(120) NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )"""
        )
        connection.execute(
            "INSERT INTO projects (id, name, description) VALUES (17, 'Projeto legado', 'Descrição preservada')"
        )
        connection.commit()

    async with api_client(create_app(data_directory)) as client:
        response = await client.get("/api/v1/projects")
        assert response.status_code == 200
        assert response.json()[0]["id"] == 17
        assert response.json()[0]["name"] == "Projeto legado"
        assert response.json()[0]["kind"] == "livre"

    with closing(sqlite3.connect(database_path)) as connection:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(projects)")}
        project = connection.execute(
            "SELECT id, name, description, kind FROM projects WHERE id = 17"
        ).fetchone()
        revision = connection.execute(
            "SELECT version_num FROM alembic_version"
        ).fetchone()
    assert "kind" in columns
    assert project == (17, "Projeto legado", "Descrição preservada", "livre")
    assert revision == ("0004_project_kind",)
