"""tool calls

Revision ID: 0004_tool_calls
Revises: 0003_knowledge
Create Date: 2026-06-29
"""

import sqlalchemy as sa
from alembic import op

revision = "0004_tool_calls"
down_revision = "0003_knowledge"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "tool_calls" in set(inspector.get_table_names()):
        return

    op.create_table(
        "tool_calls",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("message_id", sa.Integer(), nullable=False),
        sa.Column("tool_sequence", sa.Integer(), nullable=False),
        sa.Column("tool_call_id", sa.String(length=255), nullable=True),
        sa.Column("tool_name", sa.String(length=255), nullable=False),
        sa.Column("tool_arguments", sa.JSON(), nullable=False),
        sa.Column("tool_input", sa.JSON(), nullable=True),
        sa.Column("tool_result", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("tool_calls")
