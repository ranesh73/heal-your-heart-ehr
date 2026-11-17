"""patient_billing_actions_metadata

Revision ID: 20261117_patient_billing_actions_metadata
Revises: 20261117_auth_staff_and_otp
Create Date: 2026-11-17 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '20261117_patient_billing_actions_metadata'
down_revision = '20261117_auth_staff_and_otp'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = {c['name'] for c in inspector.get_columns('invoices')}

    if 'is_flagged' not in existing_cols:
        op.add_column('invoices', sa.Column('is_flagged', sa.Boolean(), nullable=False, server_default=sa.text('0')))
    if 'is_mailed' not in existing_cols:
        op.add_column('invoices', sa.Column('is_mailed', sa.Boolean(), nullable=False, server_default=sa.text('0')))
    if 'mailed_at' not in existing_cols:
        op.add_column('invoices', sa.Column('mailed_at', sa.DateTime(), nullable=True))
    if 'sent_for_collection' not in existing_cols:
        op.add_column('invoices', sa.Column('sent_for_collection', sa.Boolean(), nullable=False, server_default=sa.text('0')))
    if 'collection_at' not in existing_cols:
        op.add_column('invoices', sa.Column('collection_at', sa.DateTime(), nullable=True))
    if 'notes' not in existing_cols:
        op.add_column('invoices', sa.Column('notes', sa.Text(), nullable=False, server_default=''))
    if 'follow_up_date' not in existing_cols:
        op.add_column('invoices', sa.Column('follow_up_date', sa.Date(), nullable=True))
    if 'due_date' not in existing_cols:
        op.add_column('invoices', sa.Column('due_date', sa.Date(), nullable=True))


def downgrade():
    pass
