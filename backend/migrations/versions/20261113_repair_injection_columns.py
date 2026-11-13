"""Ensure injection catalogue and order columns exist."""
from alembic import op
import sqlalchemy as sa

revision = '20261113_repair_injection_columns'
down_revision = '20261112_appointment_status_label'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'injections' not in inspector.get_table_names():
        raise RuntimeError("The injections table is missing; cannot repair its columns.")

    columns = {column['name'] for column in inspector.get_columns('injections')}
    if 'catalogue_id' not in columns:
        op.add_column('injections', sa.Column('catalogue_id', sa.String(36), nullable=True))
    if 'order_id' not in columns:
        op.add_column('injections', sa.Column('order_id', sa.String(36), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'injections' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('injections')}
    if 'order_id' in columns:
        op.drop_column('injections', 'order_id')
    if 'catalogue_id' in columns:
        op.drop_column('injections', 'catalogue_id')
