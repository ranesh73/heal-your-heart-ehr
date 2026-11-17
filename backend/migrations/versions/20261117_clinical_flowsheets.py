"""Add configurable patient clinical flowsheets."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261117_clinical_flowsheets"
down_revision = "fee202569492"
branch_labels = None
depends_on = None


json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade():
    op.create_table(
        "flowsheet_templates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False, unique=True),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("schema_json", json_type, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_table(
        "patient_flowsheet_entries",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("template_id", sa.String(36), sa.ForeignKey("flowsheet_templates.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("values_json", json_type, nullable=False),
        sa.Column("therapist_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("physician_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_patient_flowsheet_entries_patient_id", "patient_flowsheet_entries", ["patient_id"])
    op.create_index("ix_patient_flowsheet_entries_template_id", "patient_flowsheet_entries", ["template_id"])
    op.create_index("ix_patient_flowsheet_entries_recorded_at", "patient_flowsheet_entries", ["recorded_at"])


def downgrade():
    op.drop_index("ix_patient_flowsheet_entries_recorded_at", table_name="patient_flowsheet_entries")
    op.drop_index("ix_patient_flowsheet_entries_template_id", table_name="patient_flowsheet_entries")
    op.drop_index("ix_patient_flowsheet_entries_patient_id", table_name="patient_flowsheet_entries")
    op.drop_table("patient_flowsheet_entries")
    op.drop_table("flowsheet_templates")
