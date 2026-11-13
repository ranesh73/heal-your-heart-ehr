"""Add token_number to appointments table."""
from alembic import op
import sqlalchemy as sa

revision = '20261113_appointment_token_number'
down_revision = '20261112_appointment_status_label'
branch_labels = None
depends_on = None


def upgrade():
    columns = {column['name'] for column in sa.inspect(op.get_bind()).get_columns('appointments')}
    if 'token_number' not in columns:
        op.add_column('appointments', sa.Column('token_number', sa.Integer(), nullable=True))


def downgrade():
    columns = {column['name'] for column in sa.inspect(op.get_bind()).get_columns('appointments')}
    if 'token_number' in columns:
        op.drop_column('appointments', 'token_number')
