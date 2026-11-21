"""Add tables for Heal Your Heart PHR patient portal and EHR PHR settings."""
from alembic import op
import sqlalchemy as sa


revision = "20261121_phr_portal_and_settings"
down_revision = "20261121_document_drive_file_id"
branch_labels = None
depends_on = None


def create_table_if_missing(name, *columns):
    bind = op.get_bind()
    if name not in sa.inspect(bind).get_table_names():
        op.create_table(name, *columns)


def create_index_if_missing(name, table, columns, unique=False):
    bind = op.get_bind()
    indexes = {index["name"] for index in sa.inspect(bind).get_indexes(table)}
    if name not in indexes:
        op.create_index(name, table, columns, unique=unique)


def upgrade():
    create_table_if_missing(
        "phr_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("modules_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("messaging_prefs_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("shared_clinical_sections_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("refill_prefs_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("practice_prefs_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("custom_app_menu_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    create_table_if_missing(
        "phr_useful_info",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("content_or_url", sa.Text(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
    )

    create_table_if_missing(
        "phr_announcements",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("facility_id", sa.String(36), sa.ForeignKey("facilities.id"), nullable=True),
        sa.Column("published_at", sa.DateTime(), nullable=False),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
    )
    create_index_if_missing("ix_phr_announcements_facility_id", "phr_announcements", ["facility_id"])

    create_table_if_missing(
        "patient_phr_accounts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("phone_or_email", sa.String(120), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("pin_hash", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
    )
    create_index_if_missing("ix_patient_phr_accounts_patient_id", "patient_phr_accounts", ["patient_id"], unique=True)
    create_index_if_missing("ix_patient_phr_accounts_phone_or_email", "patient_phr_accounts", ["phone_or_email"], unique=True)

    create_table_if_missing(
        "patient_phr_sessions",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    create_index_if_missing("ix_patient_phr_sessions_patient_id", "patient_phr_sessions", ["patient_id"])

    create_table_if_missing(
        "phr_appointment_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("facility_id", sa.String(36), sa.ForeignKey("facilities.id"), nullable=False),
        sa.Column("provider_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("preferred_date", sa.String(30), nullable=False),
        sa.Column("preferred_time_slot", sa.String(50), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
    )
    create_index_if_missing("ix_phr_appointment_requests_patient_id", "phr_appointment_requests", ["patient_id"])
    create_index_if_missing("ix_phr_appointment_requests_facility_id", "phr_appointment_requests", ["facility_id"])

    create_table_if_missing(
        "phr_refill_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("prescription_id", sa.String(36), nullable=True),
        sa.Column("medication_name", sa.String(200), nullable=False),
        sa.Column("refill_type", sa.String(30), nullable=False, server_default="rx"),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
    )
    create_index_if_missing("ix_phr_refill_requests_patient_id", "phr_refill_requests", ["patient_id"])


def downgrade():
    op.drop_table("phr_refill_requests")
    op.drop_table("phr_appointment_requests")
    op.drop_table("patient_phr_sessions")
    op.drop_table("patient_phr_accounts")
    op.drop_table("phr_announcements")
    op.drop_table("phr_useful_info")
    op.drop_table("phr_settings")
