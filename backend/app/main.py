from __future__ import annotations

import os
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

from app.config import get_database_path, get_data_directory
from app.database import connect, get_setting, initialize_database, set_setting

API_VERSION = "0.1.0"
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


class SettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    theme: Literal["dark", "light"]


def _allowed_origins() -> list[str]:
    configured_origins = os.getenv("REVISAI_CORS_ORIGINS")
    if not configured_origins:
        return DEFAULT_CORS_ORIGINS
    return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]


def create_app(data_directory: Path | None = None) -> FastAPI:
    resolved_data_directory = (data_directory or get_data_directory()).expanduser().resolve()
    database_path = get_database_path(resolved_data_directory)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        initialize_database(database_path)
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
        allow_methods=["GET", "PATCH", "OPTIONS"],
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
        )

    return application


app = create_app()
