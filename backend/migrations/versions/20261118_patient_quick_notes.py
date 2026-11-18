"""Add patient_quick_notes table for Quick Notes & Calendar Sticky Notes."""
from alembic import op
import sqlalchemy as sa


revision = "20261118_patient_quick_notes"
down_revision = "20261118_patient_alerts"
branch_labels = None
depends_on = None


def create_table_if_missing(name, *columns):
    if name not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table(name, *columns)


def create_index_if_missing(name, table, columns):
    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table)}
    if name not in indexes:
        op.create_index(name, table, columns)


def upgrade():
    create_table_if_missing(
        "patient_quick_notes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("color", sa.String(24), nullable=False, server_default="yellow"),
        sa.Column("created_by_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_by_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "color IN ('yellow','mint','blue','pink')",
            name="ck_patient_quick_notes_color",
        ),
    )
    create_index_if_missing("ix_patient_quick_notes_patient_id", "patient_quick_notes", ["patient_id"])


def downgrade():
    op.drop_table("patient_quick_notes")
