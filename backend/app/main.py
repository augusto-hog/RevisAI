from __future__ import annotations

import sqlite3
import uuid
import hashlib
import io
import os
import re
import zipfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import pymupdf
from docx import Document
from alembic import command
from alembic.config import Config
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.config import get_database_path, get_data_directory, get_max_upload_bytes
from app.database import connect, get_setting, initialize_database, set_setting
from app.models import Discipline, Material, MaterialBlob, Project, Subject, Topic
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, joinedload
from PIL import Image, UnidentifiedImageError

API_VERSION = "0.1.0"
ALLOWED_MATERIAL_SUFFIXES = {".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg"}
DEFAULT_CORS_ORIGINS = [
    "http://127.0.0.1:1420",
    "http://localhost:1420",
    "tauri://localhost",
    "http://tauri.localhost",
    "https://tauri.localhost",
]


class HealthResponse(BaseModel):
    status: Literal["ok"]
    database: Literal["ok"]
    version: str


class SettingsResponse(BaseModel):
    theme: Literal["dark", "light"]
    data_directory: str
    max_upload_bytes: int


class SettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    theme: Literal["dark", "light"]


class ProjectInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=4000)
    kind: Literal["livre", "concurso"] = "livre"

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Informe o nome do projeto.")
        return value.strip()


class ProjectPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=4000)
    kind: Literal["livre", "concurso"] | None = None


class StudyNodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=160)
    position: int = Field(default=0, ge=0)

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Informe um nome.")
        return value.strip()


class ReorderInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ids: list[int] = Field(min_length=1)


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    kind: str
    created_at: str | None


class TopicResponse(BaseModel):
    id: int
    name: str
    position: int


class SubjectResponse(BaseModel):
    id: int
    name: str
    position: int
    topics: list[TopicResponse] = Field(default_factory=list)


class DisciplineResponse(BaseModel):
    id: int
    name: str
    position: int
    subjects: list[SubjectResponse] = Field(default_factory=list)


class ProjectDetailResponse(ProjectResponse):
    disciplines: list[DisciplineResponse] = Field(default_factory=list)


class NodeResponse(BaseModel):
    id: int
    name: str
    position: int


class MaterialResponse(BaseModel):
    id: int
    project_id: int
    name: str
    format: str
    size: int
    imported_at: str | None
    status: str
    sha256: str
    storage_id: str
    extracted_text: str


class MaterialDetailResponse(MaterialResponse):
    text: str


class MaterialTextResponse(BaseModel):
    material_id: int
    text: str
    status: str


def _allowed_origins() -> list[str]:
    configured_origins = os.getenv("REVISAI_CORS_ORIGINS")
    if not configured_origins:
        return DEFAULT_CORS_ORIGINS
    return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]


def _safe_original_name(filename: str | None) -> str:
    if not filename or "\x00" in filename:
        raise HTTPException(422, "Nome de arquivo inválido.")
    name = filename.replace("\\", "/").rsplit("/", 1)[-1]
    name = re.sub(r"[\x00-\x1f\x7f]", "", name).strip()
    if not name or name in {".", ".."}:
        raise HTTPException(422, "Nome de arquivo inválido.")
    return name[:255]


def _validate_material_bytes(suffix: str, content: bytes) -> None:
    if not content:
        raise HTTPException(422, "O arquivo está vazio.")
    valid = False
    if suffix == ".pdf":
        valid = content.startswith(b"%PDF-")
    elif suffix == ".docx":
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                names = set(archive.namelist())
                valid = "[Content_Types].xml" in names and "word/document.xml" in names
        except (zipfile.BadZipFile, OSError):
            valid = False
    elif suffix == ".txt":
        try:
            content.decode("utf-8-sig")
            valid = b"\x00" not in content
        except UnicodeDecodeError:
            valid = False
    elif suffix in {".jpg", ".jpeg", ".png"}:
        try:
            with Image.open(io.BytesIO(content)) as image:
                expected_format = "PNG" if suffix == ".png" else "JPEG"
                valid = image.format == expected_format
                image.verify()
        except (UnidentifiedImageError, OSError, ValueError):
            valid = False
    if not valid:
        raise HTTPException(415, "O conteúdo do arquivo não corresponde ao formato informado ou está corrompido.")


def _extract_material_text(suffix: str, content: bytes) -> tuple[str, str]:
    if suffix == ".txt":
        return content.decode("utf-8-sig"), "texto_extraido"
    if suffix == ".docx":
        text = "\n".join(paragraph.text for paragraph in Document(io.BytesIO(content)).paragraphs)
        return text, "texto_extraido"
    if suffix == ".pdf":
        with pymupdf.open(stream=content, filetype="pdf") as pdf:
            pages = [page.get_text().strip() for page in pdf]
        text = "\n\f\n".join(pages)
        return text, "texto_extraido" if any(pages) else "sem_texto_precisa_ocr"
    return "", "imagem_ocr_pendente"


def create_app(data_directory: Path | None = None) -> FastAPI:
    resolved_data_directory = (data_directory or get_data_directory()).expanduser().resolve()
    database_path = get_database_path(resolved_data_directory)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        initialize_database(database_path)
        migration_config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
        migration_config.set_main_option("script_location", str(Path(__file__).parent / "migrations"))
        migration_config.set_main_option("sqlalchemy.url", f"sqlite:///{database_path.as_posix()}")
        command.upgrade(migration_config, "head")
        yield

    application = FastAPI(
        title="RevisAI API",
        version=API_VERSION,
        docs_url=None,
        redoc_url=None,
        lifespan=lifespan,
    )
    application.state.database_path = database_path
    application.state.data_directory = resolved_data_directory
    application.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    @application.get("/api/v1/health", response_model=HealthResponse)
    def health(request: Request) -> HealthResponse:
        try:
            with connect(request.app.state.database_path) as connection:
                connection.execute("SELECT 1").fetchone()
        except (OSError, sqlite3.Error) as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="O banco local não está disponível.",
            ) from error
        return HealthResponse(status="ok", database="ok", version=API_VERSION)

    @application.get("/api/v1/settings", response_model=SettingsResponse)
    def read_settings(request: Request) -> SettingsResponse:
        try:
            theme = get_setting(request.app.state.database_path, "theme") or "dark"
        except sqlite3.Error as error:
            raise HTTPException(status_code=503, detail="Não foi possível ler as configurações.") from error
        return SettingsResponse(
            theme=theme,
            data_directory=str(request.app.state.data_directory),
            max_upload_bytes=get_max_upload_bytes(),
        )

    @application.patch("/api/v1/settings", response_model=SettingsResponse)
    def update_settings(payload: SettingsUpdate, request: Request) -> SettingsResponse:
        try:
            set_setting(request.app.state.database_path, "theme", payload.theme)
        except sqlite3.Error as error:
            raise HTTPException(status_code=503, detail="Não foi possível salvar as configurações.") from error
        return SettingsResponse(
            theme=payload.theme,
            data_directory=str(request.app.state.data_directory),
            max_upload_bytes=get_max_upload_bytes(),
        )

    engine = create_engine(f"sqlite:///{database_path.as_posix()}", connect_args={"check_same_thread": False})
    from sqlalchemy import event

    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(dbapi_connection, _):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    def session():
        return Session(engine)

    def project_dict(project: Project):
        return {"id": project.id, "name": project.name, "description": project.description, "kind": project.kind, "created_at": project.created_at.isoformat() if project.created_at else None,
                "disciplines": [{"id": discipline.id, "name": discipline.name, "position": discipline.position, "subjects": [{"id": subject.id, "name": subject.name, "position": subject.position, "topics": [{"id": topic.id, "name": topic.name, "position": topic.position} for topic in subject.topics]} for subject in discipline.subjects]} for discipline in project.disciplines],
                "materials": [material_dict(item) for item in project.materials]}

    def hierarchy_dict(project: Project):
        return {"id": project.id, "name": project.name, "description": project.description, "kind": project.kind,
                "created_at": project.created_at.isoformat() if project.created_at else None,
                "disciplines": [{"id": discipline.id, "name": discipline.name, "position": discipline.position,
                    "subjects": [{"id": subject.id, "name": subject.name, "position": subject.position,
                        "topics": [{"id": topic.id, "name": topic.name, "position": topic.position} for topic in subject.topics]}
                        for subject in discipline.subjects]} for discipline in project.disciplines]}

    def material_dict(item: Material):
        return {"id": item.id, "project_id": item.project_id, "name": item.name, "format": item.format,
                "size": item.size, "imported_at": item.imported_at.isoformat() if item.imported_at else None,
                "status": item.status, "sha256": item.sha256,
                "storage_id": item.blob.stored_name if item.blob else item.stored_name,
                "extracted_text": item.extracted_text}

    @application.get("/api/v1/projects", response_model=list[dict])
    def list_projects():
        with session() as db:
            projects = db.scalars(select(Project).options(joinedload(Project.disciplines).joinedload(Discipline.subjects).joinedload(Subject.topics), joinedload(Project.materials).joinedload(Material.blob)).order_by(Project.created_at.desc())).unique().all()
            return [project_dict(project) for project in projects]

    @application.post("/api/v1/projects", status_code=201, response_model=ProjectResponse)
    def create_project(payload: ProjectInput):
        name = payload.name.strip()
        with session() as db:
            project = Project(name=name, description=payload.description.strip(), kind=payload.kind)
            db.add(project); db.commit(); db.refresh(project)
            return project_dict(project)

    @application.patch("/api/v1/projects/{project_id}")
    def edit_project(project_id: int, payload: ProjectPatch):
        with session() as db:
            project = db.get(Project, project_id)
            if not project: raise HTTPException(404, "Projeto não encontrado.")
            changes = payload.model_dump(exclude_unset=True)
            if changes.get("name") is not None: project.name = changes["name"].strip()
            if changes.get("description") is not None: project.description = changes["description"].strip()
            if changes.get("kind") is not None: project.kind = changes["kind"]
            db.commit(); db.refresh(project); return project_dict(project)

    @application.delete("/api/v1/projects/{project_id}", status_code=204)
    def delete_project(project_id: int):
        stored_to_remove = []
        with session() as db:
            project = db.get(Project, project_id)
            if not project:
                raise HTTPException(404, "Projeto nao encontrado.")
            blob_ids = {item.blob_id for item in project.materials if item.blob_id is not None}
            db.delete(project)
            db.commit()
            orphaned = db.scalars(select(MaterialBlob).where(MaterialBlob.id.in_(blob_ids))).all() if blob_ids else []
            for blob in orphaned:
                if db.scalar(select(Material.id).where(Material.blob_id == blob.id).limit(1)) is None:
                    stored_to_remove.append(blob.stored_name)
                    db.delete(blob)
            db.commit()
        for stored_name in stored_to_remove:
            blob_path(stored_name).unlink(missing_ok=True)

    @application.post("/api/v1/projects/{project_id}/disciplines", status_code=201)
    def create_discipline(project_id: int, payload: StudyNodeInput):
        with session() as db:
            if not db.get(Project, project_id): raise HTTPException(404, "Projeto não encontrado.")
            name = payload.name.strip()
            if not name: raise HTTPException(422, "Informe o nome da disciplina.")
            item = Discipline(project_id=project_id, name=name, position=payload.position); db.add(item); db.commit(); db.refresh(item)
            return {"id": item.id, "name": item.name, "position": item.position}

    @application.patch("/api/v1/disciplines/{subject_id}")
    def edit_discipline(subject_id: int, payload: StudyNodeInput):
        with session() as db:
            item = db.get(Discipline, subject_id)
            if not item: raise HTTPException(404, "Disciplina não encontrada.")
            item.name = payload.name.strip(); item.position = payload.position; db.commit()
            return {"id": item.id, "name": item.name, "position": item.position}

    @application.delete("/api/v1/disciplines/{subject_id}", status_code=204)
    def delete_discipline(subject_id: int):
        with session() as db:
            item = db.get(Discipline, subject_id)
            if not item: raise HTTPException(404, "Disciplina não encontrada.")
            db.delete(item); db.commit()

    @application.post("/api/v1/disciplines/{discipline_id}/subjects", status_code=201)
    def create_subject(discipline_id: int, payload: StudyNodeInput):
        with session() as db:
            if not db.get(Discipline, discipline_id): raise HTTPException(404, "Disciplina não encontrada.")
            name = payload.name.strip()
            if not name: raise HTTPException(422, "Informe o nome do assunto.")
            item = Subject(discipline_id=discipline_id, name=name, position=payload.position); db.add(item); db.commit(); db.refresh(item)
            return {"id": item.id, "name": item.name, "position": item.position}

    @application.patch("/api/v1/subjects/{subject_id}")
    def edit_subject(subject_id: int, payload: StudyNodeInput):
        with session() as db:
            item = db.get(Subject, subject_id)
            if not item: raise HTTPException(404, "Assunto não encontrado.")
            item.name = payload.name.strip(); item.position = payload.position; db.commit()
            return {"id": item.id, "name": item.name, "position": item.position}

    @application.delete("/api/v1/subjects/{subject_id}", status_code=204)
    def delete_subject(subject_id: int):
        with session() as db:
            item = db.get(Subject, subject_id)
            if not item: raise HTTPException(404, "Assunto não encontrado.")
            db.delete(item); db.commit()

    @application.post("/api/v1/subjects/{subject_id}/topics", status_code=201)
    def create_topic(subject_id: int, payload: StudyNodeInput):
        with session() as db:
            if not db.get(Subject, subject_id): raise HTTPException(404, "Disciplina não encontrada.")
            name = payload.name.strip()
            if not name: raise HTTPException(422, "Informe o nome do tópico.")
            item = Topic(subject_id=subject_id, name=name, position=payload.position); db.add(item); db.commit(); db.refresh(item)
            return {"id": item.id, "name": item.name, "position": item.position}

    @application.patch("/api/v1/topics/{topic_id}")
    def edit_topic(topic_id: int, payload: StudyNodeInput):
        with session() as db:
            item = db.get(Topic, topic_id)
            if not item: raise HTTPException(404, "Tópico não encontrado.")
            item.name = payload.name.strip(); item.position = payload.position; db.commit()
            return {"id": item.id, "name": item.name, "position": item.position}

    @application.delete("/api/v1/topics/{topic_id}", status_code=204)
    def delete_topic(topic_id: int):
        with session() as db:
            item = db.get(Topic, topic_id)
            if not item: raise HTTPException(404, "Tópico não encontrado.")
            db.delete(item); db.commit()

    @application.get("/api/v1/projects/{project_id}", response_model=ProjectDetailResponse)
    def get_project(project_id: int):
        with session() as db:
            project = db.scalar(select(Project).options(joinedload(Project.disciplines).joinedload(Discipline.subjects).joinedload(Subject.topics)).where(Project.id == project_id))
            if not project: raise HTTPException(404, "Projeto não encontrado.")
            return hierarchy_dict(project)

    @application.get("/api/v1/disciplines/{discipline_id}")
    def get_discipline(discipline_id: int):
        with session() as db:
            item = db.get(Discipline, discipline_id)
            if not item: raise HTTPException(404, "Disciplina não encontrada.")
            return {"id": item.id, "name": item.name, "position": item.position, "project_id": item.project_id}

    @application.get("/api/v1/projects/{project_id}/disciplines")
    def list_disciplines(project_id: int):
        with session() as db:
            if not db.get(Project, project_id): raise HTTPException(404, "Projeto não encontrado.")
            return [{"id": x.id, "name": x.name, "position": x.position} for x in db.scalars(select(Discipline).where(Discipline.project_id == project_id).order_by(Discipline.position)).all()]

    @application.get("/api/v1/subjects/{subject_id}")
    def get_subject(subject_id: int):
        with session() as db:
            item = db.get(Subject, subject_id)
            if not item: raise HTTPException(404, "Assunto não encontrado.")
            return {"id": item.id, "name": item.name, "position": item.position, "discipline_id": item.discipline_id}

    @application.get("/api/v1/disciplines/{discipline_id}/subjects")
    def list_subjects(discipline_id: int):
        with session() as db:
            if not db.get(Discipline, discipline_id): raise HTTPException(404, "Disciplina não encontrada.")
            return [{"id": x.id, "name": x.name, "position": x.position} for x in db.scalars(select(Subject).where(Subject.discipline_id == discipline_id).order_by(Subject.position)).all()]

    @application.get("/api/v1/topics/{topic_id}")
    def get_topic(topic_id: int):
        with session() as db:
            item = db.get(Topic, topic_id)
            if not item: raise HTTPException(404, "Tópico não encontrado.")
            return {"id": item.id, "name": item.name, "position": item.position, "subject_id": item.subject_id}

    @application.get("/api/v1/subjects/{subject_id}/topics")
    def list_topics(subject_id: int):
        with session() as db:
            if not db.get(Subject, subject_id): raise HTTPException(404, "Assunto não encontrado.")
            return [{"id": x.id, "name": x.name, "position": x.position} for x in db.scalars(select(Topic).where(Topic.subject_id == subject_id).order_by(Topic.position)).all()]

    def reorder(model, parent_field: str, parent_id: int, payload: ReorderInput):
        with session() as db:
            siblings = db.scalars(select(model).where(getattr(model, parent_field) == parent_id).order_by(model.position)).all()
            current_ids = {item.id for item in siblings}
            if len(payload.ids) != len(current_ids) or set(payload.ids) != current_ids:
                raise HTTPException(422, "A ordem deve conter todos os elementos irmãos exatamente uma vez.")
            by_id = {item.id: item for item in siblings}
            for position, item_id in enumerate(payload.ids): by_id[item_id].position = position
            db.commit()
            return [{"id": item_id, "position": position} for position, item_id in enumerate(payload.ids)]

    @application.put("/api/v1/projects/{project_id}/disciplines/order")
    def reorder_disciplines(project_id: int, payload: ReorderInput):
        if not session().get(Project, project_id): raise HTTPException(404, "Projeto não encontrado.")
        return reorder(Discipline, "project_id", project_id, payload)

    @application.put("/api/v1/disciplines/{discipline_id}/subjects/order")
    def reorder_subjects(discipline_id: int, payload: ReorderInput):
        if not session().get(Discipline, discipline_id): raise HTTPException(404, "Disciplina não encontrada.")
        return reorder(Subject, "discipline_id", discipline_id, payload)

    @application.put("/api/v1/subjects/{subject_id}/topics/order")
    def reorder_topics(subject_id: int, payload: ReorderInput):
        if not session().get(Subject, subject_id): raise HTTPException(404, "Assunto não encontrado.")
        return reorder(Topic, "subject_id", subject_id, payload)

    def blob_path(stored_name: str) -> Path:
        # Stored names are generated internally; constrain legacy DB values too.
        if not re.fullmatch(r"[A-Za-z0-9_-]+(?:\.[A-Za-z0-9]+)?", stored_name):
            raise HTTPException(500, "Localizacao interna do material invalida.")
        root = (resolved_data_directory / "materials").resolve()
        target = (root / stored_name).resolve()
        if target.parent != root:
            raise HTTPException(500, "Localizacao interna do material invalida.")
        return target

    @application.post("/api/v1/projects/{project_id}/materials", status_code=201, response_model=MaterialResponse)
    async def upload_material(project_id: int, file: UploadFile = File(...)):
        original_name = _safe_original_name(file.filename)
        suffix = Path(original_name).suffix.lower()
        if suffix not in ALLOWED_MATERIAL_SUFFIXES:
            raise HTTPException(415, "Formato nao permitido.")
        limit = get_max_upload_bytes()
        content = await file.read(limit + 1)
        if len(content) > limit:
            raise HTTPException(413, f"Arquivo maior que {limit} bytes.")
        _validate_material_bytes(suffix, content)
        digest = hashlib.sha256(content).hexdigest()
        try:
            extracted_text, processing_status = _extract_material_text(suffix, content)
        except Exception as error:
            raise HTTPException(422, "Arquivo corrompido ou impossivel de processar.") from error

        folder = resolved_data_directory / "materials"
        folder.mkdir(parents=True, exist_ok=True)
        target = blob_path(digest)
        created_file = False
        with session() as db:
            if not db.get(Project, project_id):
                raise HTTPException(404, "Projeto nao encontrado.")
            if db.scalar(select(Material.id).where(Material.project_id == project_id, Material.sha256 == digest)):
                raise HTTPException(409, "Este arquivo ja foi importado neste projeto.")
            blob = db.scalar(select(MaterialBlob).where(MaterialBlob.sha256 == digest))
            if blob is None:
                blob = MaterialBlob(sha256=digest, stored_name=digest, size=len(content))
                db.add(blob)
                db.flush()
            existed_before = target.exists()
            if existed_before and not target.is_file():
                raise HTTPException(500, "A localizacao interna do material nao e um arquivo regular.")
            content_is_present = existed_before and hashlib.sha256(target.read_bytes()).hexdigest() == digest
            if not content_is_present:
                temporary = folder / f".{uuid.uuid4().hex}.tmp"
                try:
                    with temporary.open("xb") as stream:
                        stream.write(content)
                        stream.flush()
                        os.fsync(stream.fileno())
                    os.replace(temporary, target)
                    created_file = not existed_before
                finally:
                    temporary.unlink(missing_ok=True)

            item = Material(
                project_id=project_id, name=original_name, format=suffix[1:], size=len(content),
                stored_name=f"{uuid.uuid4().hex}{suffix}", sha256=digest, blob=blob,
                status=processing_status, extracted_text=extracted_text,
            )
            db.add(item)
            try:
                db.commit()
                db.refresh(item)
                return material_dict(item)
            except Exception as error:
                db.rollback()
                if created_file:
                    target.unlink(missing_ok=True)
                raise HTTPException(409, "Nao foi possivel registrar o material; tente novamente.") from error

    @application.get("/api/v1/projects/{project_id}/materials", response_model=list[MaterialResponse])
    def list_materials(project_id: int):
        with session() as db:
            if not db.get(Project, project_id):
                raise HTTPException(404, "Projeto nao encontrado.")
            return [material_dict(item) for item in db.scalars(select(Material).options(joinedload(Material.blob)).where(Material.project_id == project_id).order_by(Material.imported_at.desc(), Material.id)).all()]

    @application.get("/api/v1/projects/{project_id}/materials/{material_id}", response_model=MaterialDetailResponse)
    def get_project_material(project_id: int, material_id: int):
        with session() as db:
            item = db.scalar(select(Material).options(joinedload(Material.blob)).where(Material.id == material_id, Material.project_id == project_id))
            if not item:
                raise HTTPException(404, "Material nao encontrado neste projeto.")
            return {**material_dict(item), "text": item.extracted_text}

    @application.get("/api/v1/projects/{project_id}/materials/{material_id}/text", response_model=MaterialTextResponse)
    def get_material_text(project_id: int, material_id: int):
        with session() as db:
            item = db.scalar(select(Material).options(joinedload(Material.blob)).where(Material.id == material_id, Material.project_id == project_id))
            if not item:
                raise HTTPException(404, "Material nao encontrado neste projeto.")
            if not item.extracted_text:
                raise HTTPException(404, "Este material nao possui texto extraido. OCR nao esta disponivel.")
            return {"material_id": item.id, "text": item.extracted_text, "status": item.status}

    @application.post("/api/v1/projects/{project_id}/materials/{material_id}/reprocess", response_model=MaterialDetailResponse)
    def reprocess_material(project_id: int, material_id: int):
        with session() as db:
            item = db.scalar(select(Material).options(joinedload(Material.blob)).where(Material.id == material_id, Material.project_id == project_id))
            if not item:
                raise HTTPException(404, "Material nao encontrado neste projeto.")
            blob = db.get(MaterialBlob, item.blob_id) if item.blob_id else None
            path = blob_path(blob.stored_name if blob else item.stored_name)
            try:
                content = path.read_bytes()
                suffix = f".{item.format.lower()}"
                _validate_material_bytes(suffix, content)
                extracted_text, processing_status = _extract_material_text(suffix, content)
            except FileNotFoundError as error:
                raise HTTPException(404, "Arquivo nao encontrado no armazenamento local.") from error
            except HTTPException:
                raise
            except Exception as error:
                raise HTTPException(422, "Arquivo corrompido ou impossivel de processar.") from error
            item.extracted_text = extracted_text
            item.status = processing_status
            db.commit()
            return {**material_dict(item), "text": item.extracted_text}

    @application.delete("/api/v1/projects/{project_id}/materials/{material_id}", status_code=204)
    def delete_project_material(project_id: int, material_id: int):
        stored_to_remove = None
        with session() as db:
            item = db.scalar(select(Material).where(Material.id == material_id, Material.project_id == project_id))
            if not item:
                raise HTTPException(404, "Material nao encontrado neste projeto.")
            blob = db.get(MaterialBlob, item.blob_id) if item.blob_id else None
            db.delete(item)
            db.flush()
            if blob:
                remaining = db.scalar(select(Material.id).where(Material.blob_id == blob.id).limit(1))
                if remaining is None:
                    stored_to_remove = blob.stored_name
                    db.delete(blob)
            else:
                remaining = db.scalar(select(Material.id).where(Material.stored_name == item.stored_name).limit(1))
                if remaining is None:
                    stored_to_remove = item.stored_name
            db.commit()
        if stored_to_remove:
            blob_path(stored_to_remove).unlink(missing_ok=True)


    return application


app = create_app()
