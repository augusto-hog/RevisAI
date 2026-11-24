from __future__ import annotations

import hashlib
import io
import sqlite3
from contextlib import asynccontextmanager, closing
from pathlib import Path
from typing import AsyncIterator

import httpx
import pytest
import pymupdf
from docx import Document
from fastapi import FastAPI
from PIL import Image

from app.main import create_app


@asynccontextmanager
async def client_for(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            yield client


def sample_file(suffix: str) -> bytes:
    if suffix == ".txt":
        return "Conteúdo para revisão.".encode()
    if suffix == ".docx":
        document = Document()
        document.add_paragraph("Texto no documento Word.")
        result = io.BytesIO()
        document.save(result)
        return result.getvalue()
    if suffix == ".pdf":
        document = pymupdf.open()
        page = document.new_page()
        page.insert_text((72, 72), "Texto na página um.")
        page = document.new_page()
        page.insert_text((72, 72), "Texto na página dois.")
        result = document.tobytes()
        document.close()
        return result
    image = Image.new("RGB", (3, 2), color="navy")
    result = io.BytesIO()
    image.save(result, format="PNG" if suffix == ".png" else "JPEG")
    return result.getvalue()


@pytest.mark.anyio
@pytest.mark.parametrize("suffix", [".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg"])
async def test_upload_supported_formats_metadata_and_persistence(tmp_path: Path, suffix: str) -> None:
    data_directory = tmp_path / "local-data"
    content = sample_file(suffix)
    async with client_for(create_app(data_directory)) as client:
        project = (await client.post("/api/v1/projects", json={"name": "Biblioteca"})).json()
        response = await client.post(
            f"/api/v1/projects/{project['id']}/materials",
            files={"file": (f"amostra{suffix}", content, "application/octet-stream")},
        )
        assert response.status_code == 201, response.text
        material = response.json()
        assert material["project_id"] == project["id"]
        assert material["name"] == f"amostra{suffix}"
        assert material["format"] == suffix[1:]
        assert material["size"] == len(content)
        assert material["sha256"] == hashlib.sha256(content).hexdigest()
        assert material["imported_at"]
        assert material["storage_id"] == hashlib.sha256(content).hexdigest()
        assert material["status"] == ("imagem_ocr_pendente" if suffix in {".png", ".jpg", ".jpeg"} else "texto_extraido")
        assert (data_directory / "materials" / material["storage_id"]).read_bytes() == content
        listed = await client.get(f"/api/v1/projects/{project['id']}/materials")
        assert [row["id"] for row in listed.json()] == [material["id"]]
        details = await client.get(f"/api/v1/projects/{project['id']}/materials/{material['id']}")
        assert details.status_code == 200
        assert details.json()["text"] == material["extracted_text"]
        restarted_app = create_app(data_directory)

    async with client_for(restarted_app) as restarted:
        persisted = await restarted.get(f"/api/v1/projects/{project['id']}/materials")
        assert persisted.status_code == 200
        assert persisted.json()[0]["sha256"] == material["sha256"]


@pytest.mark.anyio
async def test_extract_text_and_preserve_pdf_page_breaks(tmp_path: Path) -> None:
    data_directory = tmp_path / "data"
    async with client_for(create_app(data_directory)) as client:
        project = (await client.post("/api/v1/projects", json={"name": "Textos"})).json()
        pdf = await client.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("pages.pdf", sample_file(".pdf"))})
        docx = await client.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("texto.docx", sample_file(".docx"))})
        txt = await client.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("texto.txt", sample_file(".txt"))})
        assert [pdf.status_code, docx.status_code, txt.status_code] == [201, 201, 201]
        assert "\f" in pdf.json()["extracted_text"]
        assert "página um" in pdf.json()["extracted_text"] and "página dois" in pdf.json()["extracted_text"]
        assert "documento Word" in docx.json()["extracted_text"]
        assert "Conteúdo para revisão" in txt.json()["extracted_text"]
        materials = await client.get(f"/api/v1/projects/{project['id']}/materials")
        assert materials.status_code == 200
        assert {item["name"] for item in materials.json()} == {"pages.pdf", "texto.docx", "texto.txt"}
        text = await client.get(f"/api/v1/projects/{project['id']}/materials/{txt.json()['id']}/text")
        assert text.status_code == 200 and "Conteúdo" in text.json()["text"]
        reprocessed = await client.post(f"/api/v1/projects/{project['id']}/materials/{txt.json()['id']}/reprocess")
        assert reprocessed.status_code == 200 and reprocessed.json()["status"] == "texto_extraido"

    async with client_for(create_app(data_directory)) as restarted:
        persisted = await restarted.get(f"/api/v1/projects/{project['id']}/materials")
        assert persisted.status_code == 200
        assert {item["name"] for item in persisted.json()} == {"pages.pdf", "texto.docx", "texto.txt"}
        assert next(item for item in persisted.json() if item["name"] == "pages.pdf")["extracted_text"].count("\f") == 1


@pytest.mark.anyio
async def test_scanned_pdf_is_successful_and_reports_ocr_requirement(tmp_path: Path) -> None:
    pdf = pymupdf.open()
    pdf.new_page()
    content = pdf.tobytes()
    pdf.close()
    async with client_for(create_app(tmp_path)) as client:
        project = (await client.post("/api/v1/projects", json={"name": "PDF"})).json()
        response = await client.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("scan.pdf", content)})
        assert response.status_code == 201
        assert response.json()["status"] == "sem_texto_precisa_ocr"
        assert response.json()["extracted_text"] == ""
        assert (await client.get(f"/api/v1/projects/{project['id']}/materials/{response.json()['id']}/text")).status_code == 404


@pytest.mark.anyio
async def test_shared_blob_deduplicates_across_projects_and_deletes_safely(tmp_path: Path) -> None:
    data_directory = tmp_path / "data"
    content = sample_file(".txt")
    async with client_for(create_app(data_directory)) as client:
        first = (await client.post("/api/v1/projects", json={"name": "A"})).json()
        second = (await client.post("/api/v1/projects", json={"name": "B"})).json()
        third = (await client.post("/api/v1/projects", json={"name": "C"})).json()
        one = await client.post(f"/api/v1/projects/{first['id']}/materials", files={"file": ("one.txt", content)})
        duplicate_same_project = await client.post(f"/api/v1/projects/{first['id']}/materials", files={"file": ("same.txt", content)})
        two = await client.post(f"/api/v1/projects/{second['id']}/materials", files={"file": ("two.txt", content)})
        three = await client.post(f"/api/v1/projects/{third['id']}/materials", files={"file": ("three.txt", content)})
        assert one.status_code == 201
        assert duplicate_same_project.status_code == 409
        assert two.status_code == 201
        assert three.status_code == 201
        assert one.json()["id"] != two.json()["id"]
        assert one.json()["storage_id"] == two.json()["storage_id"]
        blob_path = data_directory / "materials" / one.json()["storage_id"]
        assert blob_path.is_file()
        assert list((data_directory / "materials").iterdir()) == [blob_path]
        with closing(sqlite3.connect(data_directory / "revisai.sqlite3")) as connection:
            assert connection.execute("SELECT COUNT(*) FROM material_blobs").fetchone()[0] == 1
            assert connection.execute("SELECT COUNT(*) FROM materials").fetchone()[0] == 3
        assert (await client.delete(f"/api/v1/projects/{first['id']}/materials/{one.json()['id']}")).status_code == 204
        assert blob_path.is_file()
        assert (await client.get(f"/api/v1/projects/{second['id']}/materials/{two.json()['id']}")).status_code == 200
        assert (await client.delete(f"/api/v1/projects/{second['id']}")).status_code == 204
        assert blob_path.is_file()
        assert (await client.get(f"/api/v1/projects/{third['id']}/materials/{three.json()['id']}")).status_code == 200
        assert (await client.delete(f"/api/v1/projects/{third['id']}/materials/{three.json()['id']}")).status_code == 204
        assert not blob_path.exists()
        assert (await client.get(f"/api/v1/projects/{third['id']}/materials/{three.json()['id']}")).status_code == 404


@pytest.mark.anyio
async def test_upload_validation_errors_and_scoped_access(tmp_path: Path, monkeypatch) -> None:
    async with client_for(create_app(tmp_path)) as client:
        project = (await client.post("/api/v1/projects", json={"name": "A"})).json()
        other = (await client.post("/api/v1/projects", json={"name": "B"})).json()
        missing = await client.post("/api/v1/projects/9999/materials", files={"file": ("x.txt", b"valid")})
        empty = await client.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("empty.txt", b"")})
        unsupported = await client.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("x.exe", b"MZ")})
        mismatch = await client.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("fake.pdf", b"plain text")})
        corrupt_pdf = await client.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("corrupt.pdf", b"%PDF-1.7 not a valid PDF document")})
        corrupt_image = await client.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("bad.png", b"\x89PNG\r\n\x1a\ncorrupt")})
        path_name = await client.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("..\\..\\study.txt", b"safe text")})
        assert missing.status_code == 404
        assert empty.status_code == 422
        assert unsupported.status_code == 415
        assert mismatch.status_code == 415
        assert corrupt_pdf.status_code == 422
        assert corrupt_image.status_code == 415
        assert path_name.status_code == 201
        assert path_name.json()["name"] == "study.txt"
        assert (await client.get(f"/api/v1/projects/{other['id']}/materials/{path_name.json()['id']}")).status_code == 404
        assert (await client.get(f"/api/v1/projects/9999/materials")).status_code == 404
        assert (await client.delete(f"/api/v1/projects/{other['id']}/materials/{path_name.json()['id']}")).status_code == 404
        assert (await client.post(f"/api/v1/projects/{other['id']}/materials/{path_name.json()['id']}/reprocess")).status_code == 404

    monkeypatch.setenv("REVISAI_MAX_UPLOAD_BYTES", "4")
    async with client_for(create_app(tmp_path / "limited")) as limited:
        project = (await limited.post("/api/v1/projects", json={"name": "Limitado"})).json()
        too_large = await limited.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("large.txt", b"12345")})
        assert too_large.status_code == 413


@pytest.mark.anyio
async def test_corrupt_document_and_reprocessing_missing_storage_errors(tmp_path: Path) -> None:
    async with client_for(create_app(tmp_path)) as client:
        project = (await client.post("/api/v1/projects", json={"name": "Erros"})).json()
        bad_docx = await client.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("bad.docx", b"not-a-zip")})
        invalid_txt = await client.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("bad.txt", b"\xff\xfe\x00")})
        assert bad_docx.status_code == 415
        assert invalid_txt.status_code == 415
        uploaded = await client.post(f"/api/v1/projects/{project['id']}/materials", files={"file": ("good.txt", b"texto")})
        material_id = uploaded.json()["id"]
        (tmp_path / "materials" / uploaded.json()["storage_id"]).unlink()
        reprocessed = await client.post(f"/api/v1/projects/{project['id']}/materials/{material_id}/reprocess")
        assert reprocessed.status_code == 404

@pytest.mark.anyio
async def test_upgrade_existing_library_rows_preserves_data(tmp_path: Path) -> None:
    from alembic import command
    from alembic.config import Config

    from app.database import initialize_database

    data_directory = tmp_path / "legacy-data"
    database_path = data_directory / "revisai.sqlite3"
    data_directory.mkdir()
    initialize_database(database_path)
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).parents[1] / "app" / "migrations"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_path.as_posix()}")
    command.upgrade(config, "0002_study_library")

    content = b"texto legado"
    digest = hashlib.sha256(content).hexdigest()
    with closing(sqlite3.connect(database_path)) as connection:
        connection.execute("INSERT INTO projects (id, name, description, kind) VALUES (1, 'Legado', '', 'livre')")
        connection.execute(
            "INSERT INTO materials (project_id, name, format, size, stored_name, sha256, status, extracted_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (1, "material.txt", "txt", len(content), "legacy-file.txt", digest, "texto_extraido", "texto legado"),
        )
        connection.commit()
    material_folder = data_directory / "materials"
    material_folder.mkdir()
    (material_folder / "legacy-file.txt").write_bytes(content)

    async with client_for(create_app(data_directory)) as client:
        response = await client.get("/api/v1/projects/1/materials")
        assert response.status_code == 200
        assert response.json()[0]["name"] == "material.txt"
        assert response.json()[0]["extracted_text"] == "texto legado"
        assert response.json()[0]["storage_id"] == "legacy-file.txt"

    with closing(sqlite3.connect(database_path)) as connection:
        revision = connection.execute("SELECT version_num FROM alembic_version").fetchone()
        row = connection.execute("SELECT blob_id, sha256, stored_name FROM materials WHERE id = 1").fetchone()
        blob = connection.execute("SELECT sha256, stored_name, size FROM material_blobs").fetchone()
    assert revision == ("0004_project_kind",)
    assert row[0] is not None and row[1:] == (digest, "legacy-file.txt")
    assert blob == (digest, "legacy-file.txt", len(content))
    assert (material_folder / "legacy-file.txt").read_bytes() == content
