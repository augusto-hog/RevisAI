from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "RevisAI"


def get_data_directory() -> Path:
    """Return the per-user data directory, with an environment override for tests/dev."""
    configured_directory = os.getenv("REVISAI_DATA_DIR")
    if configured_directory:
        return Path(configured_directory).expanduser().resolve()

    local_app_data = os.getenv("LOCALAPPDATA")
    if local_app_data:
        return Path(local_app_data) / APP_NAME

    return Path.home() / "AppData" / "Local" / APP_NAME


def get_database_path(data_directory: Path | None = None) -> Path:
    return (data_directory or get_data_directory()) / "revisai.sqlite3"
