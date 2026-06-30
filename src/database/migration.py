from pathlib import Path

import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncEngine

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MIGRATION_DIR = PROJECT_ROOT / "migrate"

BASE_TABLES = {"attachments", "conversations", "messages", "users"}
RUN_TABLES = {"agent_runs"}
MESSAGE_0002_COLUMNS = {"status", "updated_at"}


def make_alembic_config() -> Config:
    config = Config(file_=None)
    config.set_main_option("script_location", str(MIGRATION_DIR))
    config.set_main_option("prepend_sys_path", str(PROJECT_ROOT))
    config.set_main_option("path_separator", "os")
    return config


async def upgrade_database(engine: AsyncEngine, revision: str = "head") -> None:
    async with engine.begin() as connection:
        await connection.run_sync(_stamp_legacy_schema_if_needed)
        await connection.run_sync(_upgrade_database, revision)


def _upgrade_database(connection: Connection, revision: str) -> None:
    config = make_alembic_config()
    config.attributes["connection"] = connection
    command.upgrade(config, revision)


def _stamp_legacy_schema_if_needed(connection: Connection) -> None:
    inspector = sa.inspect(connection)
    table_names = set(inspector.get_table_names())

    if "alembic_version" in table_names or not BASE_TABLES.issubset(table_names):
        return

    message_columns = {column["name"] for column in inspector.get_columns("messages")}
    revision = (
        "0002_agent_runs"
        if RUN_TABLES.issubset(table_names)
        and MESSAGE_0002_COLUMNS.issubset(message_columns)
        else "0001_initial"
    )

    config = make_alembic_config()
    config.attributes["connection"] = connection
    command.stamp(config, revision)
