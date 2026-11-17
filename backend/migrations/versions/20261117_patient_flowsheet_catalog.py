"""Persist optional patient flowsheet selections."""
from alembic import op
import sqlalchemy as sa


revision = "20261117_patient_flowsheet_catalog"
down_revision = "20261117_flowsheet_charm_layout"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "patient_flowsheet_templates",
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), primary_key=True),
        sa.Column("template_id", sa.String(36), sa.ForeignKey("flowsheet_templates.id"), primary_key=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("patient_flowsheet_templates")
