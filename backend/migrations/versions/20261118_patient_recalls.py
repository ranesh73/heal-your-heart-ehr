"""Add patient recalls, recall types, recall statuses, recall preferences, and recall templates."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261118_patient_recalls"
down_revision = "20261118_clinical_tasks_workflows"
branch_labels = None
depends_on = None


json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def create_table_if_missing(name, *columns):
    if name not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table(name, *columns)


def create_index_if_missing(name, table, columns):
    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table)}
    if name not in indexes:
        op.create_index(name, table, columns)


def upgrade():
    create_table_if_missing(
        "recall_types",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False, unique=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    create_table_if_missing(
        "recall_statuses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False, unique=True),
        sa.Column("is_system_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    create_table_if_missing(
        "recall_preferences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("default_email_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("default_sms_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("email_days_before", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("sms_days_before", sa.Integer(), nullable=False, server_default="3"),
        sa.Column(
            "sms_template_text",
            sa.Text(),
            nullable=False,
            server_default="Reminder from $PRACTICE to schedule for $NOTES. Please ignore, if already scheduled",
        ),
        sa.Column("mark_complete_on_send", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    create_table_if_missing(
        "recall_templates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("category", sa.String(20), nullable=False, server_default="PRACTICE"),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("items_json", json_type, nullable=False),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("category IN ('PRACTICE','MY')", name="ck_recall_templates_category"),
    )

    create_table_if_missing(
        "patient_recalls",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("facility_id", sa.String(36), sa.ForeignKey("facilities.id"), nullable=False),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("recall_type_id", sa.String(36), sa.ForeignKey("recall_types.id"), nullable=False),
        sa.Column("status_id", sa.String(36), sa.ForeignKey("recall_statuses.id"), nullable=False),
        sa.Column("provider_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("visit_date", sa.Date(), nullable=True),
        sa.Column("auto_reminder_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("email_reminder_days", sa.Integer(), nullable=True),
        sa.Column("sms_reminder_days", sa.Integer(), nullable=True),
        sa.Column("reminder_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    create_index_if_missing("ix_patient_recalls_facility_id", "patient_recalls", ["facility_id"])
    create_index_if_missing("ix_patient_recalls_patient_id", "patient_recalls", ["patient_id"])
    create_index_if_missing("ix_patient_recalls_recall_type_id", "patient_recalls", ["recall_type_id"])
    create_index_if_missing("ix_patient_recalls_status_id", "patient_recalls", ["status_id"])
    create_index_if_missing("ix_patient_recalls_provider_id", "patient_recalls", ["provider_id"])
    create_index_if_missing("ix_patient_recalls_due_date", "patient_recalls", ["due_date"])


def downgrade():
    op.drop_table("patient_recalls")
    op.drop_table("recall_templates")
    op.drop_table("recall_preferences")
    op.drop_table("recall_statuses")
    op.drop_table("recall_types")
