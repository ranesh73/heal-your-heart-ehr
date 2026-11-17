"""Align flowsheet schema and staff roster with the ChARM chart layouts."""
from alembic import op
import sqlalchemy as sa


revision = "20261117_flowsheet_charm_layout"
down_revision = "20261117_clinical_flowsheets"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "flowsheet_templates",
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.execute("UPDATE flowsheet_templates SET display_order = 0 WHERE slug = 'sphygmocor-report'")
    op.execute("UPDATE flowsheet_templates SET display_order = 1 WHERE slug = 'vaso-meditech-blood-sugar-chart'")
    op.execute("UPDATE flowsheet_templates SET display_order = 2 WHERE slug = 'vaso-meditech-eecp-daily-chart'")
    op.execute("UPDATE flowsheet_templates SET display_order = 3 WHERE slug = 'vaso-meditech-eecp-weekly-chart'")

    op.add_column("patient_flowsheet_entries", sa.Column("therapist_name", sa.String(120), nullable=True))
    op.add_column("patient_flowsheet_entries", sa.Column("physician_name", sa.String(120), nullable=True))
    op.execute("""
        UPDATE patient_flowsheet_entries
        SET therapist_name = (SELECT name FROM users WHERE users.id = patient_flowsheet_entries.therapist_id)
        WHERE therapist_id IS NOT NULL
    """)
    op.execute("""
        UPDATE patient_flowsheet_entries
        SET physician_name = (SELECT name FROM users WHERE users.id = patient_flowsheet_entries.physician_id)
        WHERE physician_id IS NOT NULL
    """)
    with op.batch_alter_table("patient_flowsheet_entries") as batch:
        batch.alter_column(
            "created_by",
            existing_type=sa.String(36),
            existing_nullable=False,
            nullable=True,
        )

    op.create_table(
        "flowsheet_staff_roster",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.CheckConstraint("role IN ('therapist','physician')"),
        sa.UniqueConstraint("role", "name", name="uq_flowsheet_staff_role_name"),
    )


def downgrade():
    op.drop_table("flowsheet_staff_roster")
    with op.batch_alter_table("patient_flowsheet_entries") as batch:
        batch.alter_column(
            "created_by",
            existing_type=sa.String(36),
            existing_nullable=True,
            nullable=False,
        )
        batch.drop_column("physician_name")
        batch.drop_column("therapist_name")
    op.drop_column("flowsheet_templates", "display_order")
