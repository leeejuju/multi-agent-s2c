"""agent runs and resumable events

Revision ID: 0002_agent_runs
Revises: 0001_initial
Create Date: 2026-06-03
"""

import sqlalchemy as sa
from alembic import op

revision = "0002_agent_runs"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    table_names = set(inspector.get_table_names())
    message_columns = {column["name"] for column in inspector.get_columns("messages")}

    if "status" not in message_columns:
        op.add_column(
            "messages",
            sa.Column("status", sa.String(length=16), server_default="completed", nullable=False),
        )
    if "updated_at" not in message_columns:
        op.add_column(
            "messages",
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
    if "agent_runs" not in table_names:
        op.create_table(
            "agent_runs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("conversation_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("agent_id", sa.String(length=128), nullable=False),
            sa.Column("input_text", sa.Text(), nullable=False),
            sa.Column("attachments", sa.JSON(), nullable=False),
            sa.Column("request_config", sa.JSON(), nullable=False),
            sa.Column("status", sa.String(length=16), nullable=False),
            sa.Column("error", sa.Text(), nullable=True),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        )
    message_columns = {column["name"] for column in inspector.get_columns("messages")}
    if "agent_run_id" not in message_columns:
        op.add_column(
            "messages",
            sa.Column("agent_run_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_messages_agent_run_id_agent_runs",
            "messages",
            "agent_runs",
            ["agent_run_id"],
            ["id"],
            ondelete="SET NULL",
        )

def downgrade() -> None:
    op.drop_constraint("fk_messages_agent_run_id_agent_runs", "messages", type_="foreignkey")
    op.drop_column("messages", "agent_run_id")
    op.drop_table("agent_runs")
    op.drop_column("messages", "updated_at")
    op.drop_column("messages", "status")
