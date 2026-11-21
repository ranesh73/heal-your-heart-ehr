"""Add drive_file_id column to documents table for persistent Google Drive linking."""
from alembic import op
import sqlalchemy as sa


revision = "20261121_document_drive_file_id"
down_revision = "20261121_device_import_tables"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("documents")]
    if "drive_file_id" not in columns:
        op.add_column("documents", sa.Column("drive_file_id", sa.String(120), nullable=True))
        op.create_index("ix_documents_drive_file_id", "documents", ["drive_file_id"])


def downgrade():
    op.drop_index("ix_documents_drive_file_id", table_name="documents")
    op.drop_column("documents", "drive_file_id")
