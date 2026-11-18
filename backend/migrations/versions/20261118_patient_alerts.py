"""Add persistent patient_alerts table."""
from alembic import op
import sqlalchemy as sa


revision = "20261118_patient_alerts"
down_revision = "20261118_patient_recalls"
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
        "patient_alerts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("alert_type", sa.String(40), nullable=False, server_default="medical_emergency"),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("created_by_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_by_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "alert_type IN ('medical_emergency','need_report','patient_status','contraindication')",
            name="ck_patient_alerts_alert_type",
        ),
    )
    create_index_if_missing("ix_patient_alerts_patient_id", "patient_alerts", ["patient_id"])
    create_index_if_missing("ix_patient_alerts_is_active", "patient_alerts", ["is_active"])


def downgrade():
    op.drop_table("patient_alerts")
