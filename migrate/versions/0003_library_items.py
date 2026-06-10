"""library items

Revision ID: 0003_library_items
Revises: 0002_agent_runs
Create Date: 2026-06-10
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003_library_items"
down_revision = "0002_agent_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    table_names = set(inspector.get_table_names())
    if "library_items" in table_names:
        return

    op.create_table(
        "library_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False, server_default="screenplay"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("project_name", sa.String(length=255), nullable=True),
        sa.Column("genre", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="draft"),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("content_text", sa.Text(), nullable=True),
        sa.Column("source_file_name", sa.String(length=255), nullable=True),
        sa.Column("source_content_type", sa.String(length=128), nullable=True),
        sa.Column("source_file_size", sa.Integer(), nullable=True),
        sa.Column("object_key", sa.String(length=1024), nullable=True),
        sa.Column("cover_url", sa.String(length=1024), nullable=True),
        sa.Column("shot_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "style_tags",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "characters",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "relationships",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "item_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_library_items_user_kind", "library_items", ["user_id", "kind"])


def downgrade() -> None:
    op.drop_index("ix_library_items_user_kind", table_name="library_items")
    op.drop_table("library_items")
