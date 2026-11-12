"""Add a separate user-facing appointment status label."""
from alembic import op
import sqlalchemy as sa

revision = '20261112_appointment_status_label'
down_revision = '20261112_inventory_injections'
branch_labels = None
depends_on = None


def upgrade():
    columns = {column['name'] for column in sa.inspect(op.get_bind()).get_columns('appointments')}
    if 'status_label' not in columns:
        op.add_column('appointments', sa.Column('status_label', sa.String(80), nullable=True))


def downgrade():
    columns = {column['name'] for column in sa.inspect(op.get_bind()).get_columns('appointments')}
    if 'status_label' in columns:
        op.drop_column('appointments', 'status_label')
