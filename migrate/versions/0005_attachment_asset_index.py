"""attachment asset index

Revision ID: 0005_attachment_asset_index
Revises: 0004_tool_calls
Create Date: 2026-06-29
"""

import sqlalchemy as sa
from alembic import op

revision = "0005_attachment_asset_index"
down_revision = "0004_tool_calls"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("attachments")}

    if "file_name" in columns and "attachment_name" not in columns:
        op.alter_column("attachments", "file_name", new_column_name="attachment_name")
    if "content_type" in columns and "attachment_type" not in columns:
        op.alter_column("attachments", "content_type", new_column_name="attachment_type")
    if "file_size" in columns and "attachment_size" not in columns:
        op.alter_column("attachments", "file_size", new_column_name="attachment_size")
    if "file_path" in columns and "attachment_path" not in columns:
        op.alter_column("attachments", "file_path", new_column_name="attachment_path")

    if "status" not in columns:
        op.add_column(
            "attachments",
            sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        )
    if "updated_at" not in columns:
        op.add_column(
            "attachments",
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
    if "attachment_minio_url" in columns:
        op.drop_column("attachments", "attachment_minio_url")

    if "conversation_id" in columns:
        op.execute("ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_conversation_id_fkey")
        op.alter_column("attachments", "conversation_id", existing_type=sa.Integer(), nullable=True)
        op.create_foreign_key(
            "attachments_conversation_id_fkey",
            "attachments",
            "conversations",
            ["conversation_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    pass
