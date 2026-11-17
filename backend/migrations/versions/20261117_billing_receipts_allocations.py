"""Create billing receipts and receipt allocations tables for CharmHealth payment workflow."""
from alembic import op
import sqlalchemy as sa


revision = "20261117_billing_receipts_allocations"
down_revision = "20261117_patient_flowsheet_catalog"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "billing_receipts" not in tables:
        op.create_table(
            "billing_receipts",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=False, index=True),
            sa.Column("facility_id", sa.String(36), sa.ForeignKey("facilities.id"), nullable=False, index=True),
            sa.Column("author_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("receipt_number", sa.String(50), nullable=False, unique=True, index=True),
            sa.Column("amount_paise", sa.Integer(), nullable=False),
            sa.Column("unused_paise", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("mode", sa.String(50), nullable=False, server_default="Cash"),
            sa.Column("reference", sa.String(100), nullable=False, server_default=""),
            sa.Column("other_reference", sa.String(100), nullable=False, server_default=""),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("payment_from", sa.String(50), nullable=False, server_default="Patient"),
            sa.Column("is_void", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("idempotency_key", sa.String(80), nullable=True, unique=True),
        )

    if "receipt_allocations" not in tables:
        op.create_table(
            "receipt_allocations",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("receipt_id", sa.String(36), sa.ForeignKey("billing_receipts.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("invoice_id", sa.String(36), sa.ForeignKey("invoices.id"), nullable=False, index=True),
            sa.Column("amount_paise", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("write_off_paise", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("write_off_reason", sa.Text(), nullable=False, server_default=""),
            sa.Column("comments", sa.Text(), nullable=False, server_default=""),
        )


def downgrade():
    op.drop_table("receipt_allocations")
    op.drop_table("billing_receipts")
