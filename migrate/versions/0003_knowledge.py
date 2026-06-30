"""knowledge

Revision ID: 0003_knowledge
Revises: 0002_agent_runs
Create Date: 2026-06-10
"""

import sqlalchemy as sa
from alembic import op

revision = "0003_knowledge"
down_revision = "0002_agent_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    table_names = set(inspector.get_table_names())
    if "knowledge" in table_names:
        return

    op.create_table(
        "knowledge",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False, server_default="screenplay"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("content_text", sa.Text(), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("path", sa.String(length=1024), nullable=True),
        sa.Column("minio_url", sa.String(length=1024), nullable=True),
        sa.Column("markdown_file", sa.String(length=1024), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_knowledge_user_kind", "knowledge", ["user_id", "kind"])


def downgrade() -> None:
    op.drop_index("ix_knowledge_user_kind", table_name="knowledge")
    op.drop_table("knowledge")
