"""Add processed_device_files and unmatched_device_imports tables for Google Drive device polling."""
from alembic import op
import sqlalchemy as sa


revision = "20261121_device_import_tables"
down_revision = "20261118_referrals_management"
branch_labels = None
depends_on = None


def create_table_if_missing(name, *columns):
    if name not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table(name, *columns)


def create_index_if_missing(name, table, columns, unique=False):
    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table)}
    if name not in indexes:
        op.create_index(name, table, columns, unique=unique)


def upgrade():
    create_table_if_missing(
        "processed_device_files",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("google_file_id", sa.String(120), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("modality", sa.String(30), nullable=False),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=True),
        sa.Column("patient_mrn", sa.String(50), nullable=True),
        sa.Column("order_id", sa.String(36), sa.ForeignKey("clinical_orders.id"), nullable=True),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id"), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="completed"),
        sa.Column("processed_at", sa.DateTime(), nullable=False),
        sa.Column("details", sa.Text(), nullable=False, server_default=""),
    )
    create_index_if_missing("ix_processed_device_files_google_file_id", "processed_device_files", ["google_file_id"], unique=True)
    create_index_if_missing("ix_processed_device_files_patient_id", "processed_device_files", ["patient_id"])
    create_index_if_missing("ix_processed_device_files_patient_mrn", "processed_device_files", ["patient_mrn"])
    create_index_if_missing("ix_processed_device_files_order_id", "processed_device_files", ["order_id"])

    create_table_if_missing(
        "unmatched_device_imports",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("google_file_id", sa.String(120), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("modality", sa.String(30), nullable=False),
        sa.Column("extracted_patient_id", sa.String(30), nullable=True),
        sa.Column("target_mrn", sa.String(50), nullable=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
    )
    create_index_if_missing("ix_unmatched_device_imports_google_file_id", "unmatched_device_imports", ["google_file_id"])
    create_index_if_missing("ix_unmatched_device_imports_target_mrn", "unmatched_device_imports", ["target_mrn"])
    create_index_if_missing("ix_unmatched_device_imports_patient_id", "unmatched_device_imports", ["patient_id"])


def downgrade():
    op.drop_table("unmatched_device_imports")
    op.drop_table("processed_device_files")
