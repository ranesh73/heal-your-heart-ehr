"""Add consultation records and editable discharge summaries."""
from datetime import datetime
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261117_consultations_discharge_summary"
down_revision = "20261117_patient_billing_actions_metadata"
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


def ensure_column(table, column):
    columns = {item["name"] for item in sa.inspect(op.get_bind()).get_columns(table)}
    if column.name not in columns:
        op.add_column(table, column)


def parse_datetime(value):
    if value is None or isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def upgrade():
    inspector = sa.inspect(op.get_bind())
    if "consultations" in inspector.get_table_names():
        existing_columns = {column["name"] for column in inspector.get_columns("consultations")}
        if "template_id" in existing_columns:
            op.rename_table("consultations", "template_consultation_responses")

    create_table_if_missing(
        "consultations",
        sa.Column("id", sa.String(36), sa.ForeignKey("encounters.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("provider_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("facility_id", sa.String(36), sa.ForeignKey("facilities.id"), nullable=False),
        sa.Column("facility_name", sa.String(150), nullable=False, server_default=""),
        sa.Column("visit_type", sa.String(80), nullable=False),
        sa.Column("visit_mode", sa.String(50), nullable=False, server_default="In Person"),
        sa.Column("visit_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="unsigned"),
        sa.Column("signed_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("soap_json", json_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('draft','unsigned','co_sign','signed')", name="ck_consultations_status"),
    )
    ensure_column("consultations", sa.Column("facility_id", sa.String(36), nullable=True))
    create_index_if_missing("ix_consultations_patient_id", "consultations", ["patient_id"])
    create_index_if_missing("ix_consultations_facility_id", "consultations", ["facility_id"])
    create_index_if_missing("ix_consultations_visit_date", "consultations", ["visit_date"])

    create_table_if_missing(
        "consultation_addendums",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("consultation_id", sa.String(36), sa.ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("note_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    create_index_if_missing("ix_consultation_addendums_consultation_id", "consultation_addendums", ["consultation_id"])

    create_table_if_missing(
        "discharge_summaries",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("consultation_id", sa.String(36), sa.ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("report_data_json", json_type, nullable=False),
        sa.Column("updated_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    create_index_if_missing("ix_discharge_summaries_patient_id", "discharge_summaries", ["patient_id"])

    connection = op.get_bind()
    consultation_table = sa.table(
        "consultations",
        sa.column("id", sa.String(36)),
        sa.column("patient_id", sa.String(36)),
        sa.column("provider_id", sa.String(36)),
        sa.column("facility_id", sa.String(36)),
        sa.column("facility_name", sa.String(150)),
        sa.column("visit_type", sa.String(80)),
        sa.column("visit_mode", sa.String(50)),
        sa.column("visit_date", sa.DateTime(timezone=True)),
        sa.column("status", sa.String(20)),
        sa.column("signed_by", sa.String(36)),
        sa.column("signed_at", sa.DateTime(timezone=True)),
        sa.column("soap_json", json_type),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    existing_ids = set(connection.execute(sa.select(consultation_table.c.id)).scalars())
    rows = connection.execute(sa.text(
        "SELECT e.id, e.patient_id, e.provider_id, e.facility_id, f.name AS facility_name, "
        "e.visit_type, e.mode, e.created_at, e.status, e.signed_by, e.signed_at, "
        "e.chief_complaint, e.hpi, e.medical_history, e.ros, e.objective, e.examination, "
        "e.assessment, e.plan, e.follow_up, e.treatment_notes "
        "FROM encounters e JOIN facilities f ON f.id = e.facility_id"
    )).mappings()
    for row in rows:
        if row["id"] in existing_ids:
            connection.execute(sa.text(
                "UPDATE consultations SET facility_id = :facility_id, "
                "facility_name = CASE WHEN facility_name = '' THEN :facility_name ELSE facility_name END "
                "WHERE id = :id AND (facility_id IS NULL OR facility_id = '')"
            ), {
                "id": row["id"],
                "facility_id": row["facility_id"],
                "facility_name": row["facility_name"],
            })
            continue
        soap = {
            "subjective": {
                "chief_complaints": row["chief_complaint"] or "",
                "history_of_present_illness": row["hpi"] or "",
                "past_medical_history": row["medical_history"] or "",
                "review_of_systems": row["ros"] or "",
            },
            "objective": {
                "health_vitals": row["objective"] or "",
                "physical_examination": row["examination"] or "",
            },
            "assessment": {"notes": row["assessment"] or ""},
            "plan": {
                "notes": row["plan"] or "",
                "follow_up": row["follow_up"] or "",
                "treatment_notes": row["treatment_notes"] or "",
            },
            "procedures": [],
            "codes": [],
        }
        connection.execute(consultation_table.insert().values(
            id=row["id"],
            patient_id=row["patient_id"],
            provider_id=row["provider_id"],
            facility_id=row["facility_id"],
            facility_name=row["facility_name"],
            visit_type=row["visit_type"],
            visit_mode=row["mode"],
            visit_date=parse_datetime(row["created_at"]),
            status="signed" if row["status"] == "signed" else "unsigned",
            signed_by=row["signed_by"],
            signed_at=parse_datetime(row["signed_at"]),
            soap_json=soap,
            created_at=parse_datetime(row["created_at"]),
            updated_at=parse_datetime(row["created_at"]),
        ))


def downgrade():
    op.drop_index("ix_discharge_summaries_patient_id", table_name="discharge_summaries")
    op.drop_table("discharge_summaries")
    op.drop_index("ix_consultation_addendums_consultation_id", table_name="consultation_addendums")
    op.drop_table("consultation_addendums")
    op.drop_index("ix_consultations_visit_date", table_name="consultations")
    op.drop_index("ix_consultations_facility_id", table_name="consultations")
    op.drop_index("ix_consultations_patient_id", table_name="consultations")
    op.drop_table("consultations")
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if "template_consultation_responses" in tables and "consultations" not in tables:
        op.rename_table("template_consultation_responses", "consultations")
