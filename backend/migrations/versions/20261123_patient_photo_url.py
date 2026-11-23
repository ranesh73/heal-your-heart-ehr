"""Add photo_url column to patients table."""
from alembic import op
import sqlalchemy as sa


revision = "20261123_patient_photo_url"
down_revision = "20261121_phr_portal_and_settings"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    columns = {col["name"] for col in sa.inspect(bind).get_columns("patients")}
    if "photo_url" not in columns:
        op.add_column("patients", sa.Column("photo_url", sa.Text(), nullable=True, server_default=""))


def downgrade():
    bind = op.get_bind()
    columns = {col["name"] for col in sa.inspect(bind).get_columns("patients")}
    if "photo_url" in columns:
        op.drop_column("patients", "photo_url")
