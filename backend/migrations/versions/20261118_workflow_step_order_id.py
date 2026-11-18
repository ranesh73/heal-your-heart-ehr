"""add order_id to workflow_steps

Revision ID: 20261118_workflow_order
Revises: 20261118_durable_workflow_tables
Create Date: 2026-11-18 12:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '20261118_workflow_order'
down_revision = '20261118_durable_workflow_tables'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = {c['name'] for c in inspector.get_columns('workflow_steps')}

    with op.batch_alter_table('workflow_steps', schema=None) as batch_op:
        if 'order_id' not in existing_columns:
            batch_op.add_column(sa.Column('order_id', sa.String(64), sa.ForeignKey('clinical_orders.id', name='fk_workflow_steps_order_id', ondelete='SET NULL'), nullable=True))
            batch_op.create_index('ix_workflow_steps_order_id', ['order_id'], unique=False)
            batch_op.create_unique_constraint('uq_workflow_steps_instance_order', ['instance_id', 'order_id'])

    with op.batch_alter_table('workflow_events', schema=None) as batch_op:
        batch_op.alter_column('instance_id', existing_type=sa.String(64), nullable=True)


def downgrade():
    with op.batch_alter_table('workflow_events', schema=None) as batch_op:
        batch_op.alter_column('instance_id', existing_type=sa.String(64), nullable=False)

    with op.batch_alter_table('workflow_steps', schema=None) as batch_op:
        batch_op.drop_constraint('uq_workflow_steps_instance_order', type_='unique')
        batch_op.drop_index('ix_workflow_steps_order_id')
        batch_op.drop_column('order_id')
