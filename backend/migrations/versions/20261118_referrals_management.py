"""Add external_providers, referrals, and referral_responses tables for Referrals Management."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261118_referrals_management"
down_revision = "d9b5f5e7a758"
branch_labels = None
depends_on = None


def create_table_if_missing(name, *columns):
    if name not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table(name, *columns)


def create_index_if_missing(name, table, columns):
    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table)}
    if name not in indexes:
        op.create_index(name, table, columns)


def _json_col():
    return sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")


def upgrade():
    create_table_if_missing(
        "external_providers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("prefix", sa.String(20), nullable=False, server_default="Dr"),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("middle_name", sa.String(100), nullable=False, server_default=""),
        sa.Column("specialty", sa.String(120), nullable=False, server_default=""),
        sa.Column("practice_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("about", sa.Text(), nullable=False, server_default=""),
        sa.Column("fax", sa.String(50), nullable=False, server_default=""),
        sa.Column("phone", sa.String(50), nullable=False, server_default=""),
        sa.Column("extn", sa.String(20), nullable=False, server_default=""),
        sa.Column("website", sa.String(250), nullable=False, server_default=""),
        sa.Column("email", sa.String(160), nullable=False, server_default=""),
        sa.Column("direct_address", sa.String(200), nullable=False, server_default=""),
        sa.Column("address_line1", sa.String(200), nullable=False, server_default=""),
        sa.Column("address_line2", sa.String(200), nullable=False, server_default=""),
        sa.Column("city", sa.String(100), nullable=False, server_default=""),
        sa.Column("state", sa.String(100), nullable=False, server_default=""),
        sa.Column("country", sa.String(100), nullable=False, server_default="India"),
        sa.Column("postal_code", sa.String(30), nullable=False, server_default=""),
        sa.Column("id_qualifier", sa.String(60), nullable=False, server_default=""),
        sa.Column("identifier_value", sa.String(100), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    create_table_if_missing(
        "referrals",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("facility_id", sa.String(36), sa.ForeignKey("facilities.id"), nullable=False),
        sa.Column("direction", sa.String(10), nullable=False, server_default="out"),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("referral_from_name", sa.String(180), nullable=False),
        sa.Column("referral_from_id", sa.String(36), nullable=True),
        sa.Column("referral_to_type", sa.String(20), nullable=False, server_default="external"),
        sa.Column("referral_to_name", sa.String(180), nullable=False),
        sa.Column("referral_to_provider_id", sa.String(36), nullable=True),
        sa.Column("referral_reason", sa.String(300), nullable=False, server_default=""),
        sa.Column("referral_date", sa.Date(), nullable=False),
        sa.Column("priority", sa.String(20), nullable=False, server_default="Normal"),
        sa.Column("related_encounter_id", sa.String(36), nullable=True),
        sa.Column("referral_notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("diagnoses_json", _json_col(), nullable=False),
        sa.Column("insurance_json", _json_col(), nullable=False),
        sa.Column("attachments_json", _json_col(), nullable=False),
        sa.Column("request_status", sa.String(20), nullable=False, server_default="Draft"),
        sa.Column("response_status", sa.String(30), nullable=False, server_default="Pending"),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("direction IN ('out','in')", name="ck_referrals_direction"),
        sa.CheckConstraint("referral_to_type IN ('external','internal')", name="ck_referrals_to_type"),
        sa.CheckConstraint("priority IN ('Normal','Urgent','Stat')", name="ck_referrals_priority"),
        sa.CheckConstraint("request_status IN ('Draft','Sent','Completed')", name="ck_referrals_request_status"),
        sa.CheckConstraint("response_status IN ('Pending','To Be Reviewed','Reviewed')", name="ck_referrals_response_status"),
    )
    create_index_if_missing("ix_referrals_facility_id", "referrals", ["facility_id"])
    create_index_if_missing("ix_referrals_direction", "referrals", ["direction"])
    create_index_if_missing("ix_referrals_patient_id", "referrals", ["patient_id"])
    create_index_if_missing("ix_referrals_referral_date", "referrals", ["referral_date"])
    create_index_if_missing("ix_referrals_request_status", "referrals", ["request_status"])
    create_index_if_missing("ix_referrals_response_status", "referrals", ["response_status"])

    create_table_if_missing(
        "referral_responses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("referral_id", sa.String(36), sa.ForeignKey("referrals.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("response_date", sa.Date(), nullable=False),
        sa.Column("response_notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("attachments_json", _json_col(), nullable=False),
        sa.Column("is_signed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("signed_by_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    create_index_if_missing("ix_referral_responses_referral_id", "referral_responses", ["referral_id"])


def downgrade():
    op.drop_table("referral_responses")
    op.drop_table("referrals")
    op.drop_table("external_providers")
