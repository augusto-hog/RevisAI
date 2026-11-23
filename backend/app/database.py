from __future__ import annotations

import sqlite3
from pathlib import Path

MIGRATIONS_DIRECTORY = Path(__file__).parent / "migrations"


def connect(database_path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(database_path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def _execute_migration(connection: sqlite3.Connection, sql: str) -> None:
    statement_buffer = ""
    for line in sql.splitlines():
        statement_buffer += f"{line}\n"
        if sqlite3.complete_statement(statement_buffer):
            statement = statement_buffer.strip()
            if statement:
                connection.execute(statement)
            statement_buffer = ""

    if statement_buffer.strip():
        raise ValueError("A migração SQLite contém uma instrução incompleta.")


def initialize_database(database_path: Path) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)

    with connect(database_path) as connection:
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute(
            """CREATE TABLE IF NOT EXISTS schema_migrations (
                   version TEXT PRIMARY KEY,
                   applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
               )"""
        )
        for migration_path in sorted(MIGRATIONS_DIRECTORY.glob("*.sql")):
            connection.execute("BEGIN IMMEDIATE")
            applied = connection.execute(
                "SELECT 1 FROM schema_migrations WHERE version = ?",
                (migration_path.stem,),
            ).fetchone()
            if applied:
                connection.commit()
                continue

            _execute_migration(
                connection,
                migration_path.read_text(encoding="utf-8"),
            )
            connection.execute(
                "INSERT INTO schema_migrations (version) VALUES (?)",
                (migration_path.stem,),
            )
            connection.commit()


def get_setting(database_path: Path, key: str) -> str | None:
    with connect(database_path) as connection:
        row = connection.execute(
            "SELECT value FROM app_settings WHERE key = ?", (key,)
        ).fetchone()
        return row["value"] if row else None


def set_setting(database_path: Path, key: str, value: str) -> None:
    with connect(database_path) as connection:
        connection.execute(
            """INSERT INTO app_settings (key, value, updated_at)
               VALUES (?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(key) DO UPDATE SET
                 value = excluded.value,
                 updated_at = CURRENT_TIMESTAMP""",
            (key, value),
        )
