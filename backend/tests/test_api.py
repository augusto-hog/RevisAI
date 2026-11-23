from pathlib import Path
import sqlite3

from fastapi.testclient import TestClient

from app.config import get_data_directory
from app.main import create_app


def test_health_initializes_database_and_first_migration(tmp_path: Path) -> None:
    database_path = tmp_path / "user-data" / "revisai.sqlite3"
    application = create_app(tmp_path / "user-data")

    with TestClient(application) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok", "version": "0.1.0"}
    assert database_path.is_file()

    with sqlite3.connect(database_path) as connection:
        versions = connection.execute("SELECT version FROM schema_migrations").fetchall()
        theme = connection.execute(
            "SELECT value FROM app_settings WHERE key = 'theme'"
        ).fetchone()

    assert versions == [("0001_initial",)]
    assert theme == ("dark",)


def test_settings_default_and_theme_persist_after_restart(tmp_path: Path) -> None:
    data_directory = tmp_path / "user-data"

    with TestClient(create_app(data_directory)) as client:
        initial = client.get("/api/v1/settings")
        assert initial.status_code == 200
        assert initial.json()["theme"] == "dark"
        assert initial.json()["data_directory"] == str(data_directory.resolve())

        updated = client.patch("/api/v1/settings", json={"theme": "light"})
        assert updated.status_code == 200
        assert updated.json()["theme"] == "light"

    with TestClient(create_app(data_directory)) as restarted_client:
        persisted = restarted_client.get("/api/v1/settings")

    assert persisted.json()["theme"] == "light"


def test_settings_reject_unknown_values_and_fields(tmp_path: Path) -> None:
    with TestClient(create_app(tmp_path)) as client:
        invalid_theme = client.patch("/api/v1/settings", json={"theme": "system"})
        unexpected_field = client.patch(
            "/api/v1/settings", json={"theme": "dark", "admin": True}
        )

    assert invalid_theme.status_code == 422
    assert unexpected_field.status_code == 422


def test_data_directory_uses_windows_user_local_app_data(monkeypatch, tmp_path: Path) -> None:
    expected_directory = tmp_path / "local-app-data"
    monkeypatch.setenv("LOCALAPPDATA", str(expected_directory))
    monkeypatch.delenv("REVISAI_DATA_DIR", raising=False)

    assert get_data_directory() == expected_directory / "RevisAI"


def test_cors_rejects_an_unlisted_origin(tmp_path: Path) -> None:
    with TestClient(create_app(tmp_path)) as client:
        response = client.options(
            "/api/v1/settings",
            headers={
                "Origin": "https://untrusted.example",
                "Access-Control-Request-Method": "PATCH",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
