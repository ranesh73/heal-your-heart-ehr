"""create ai_pending_actions and relax workflow_steps order_id foreign key

Revision ID: 20261118_ai_pending_actions
Revises: 20261118_workflow_order
Create Date: 2026-11-18 13:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '20261118_ai_pending_actions'
down_revision = '20261118_workflow_order'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if 'ai_pending_actions' not in existing_tables:
        op.create_table(
            'ai_pending_actions',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('facility_id', sa.String(length=36), sa.ForeignKey('facilities.id'), nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('tool', sa.String(length=100), nullable=False),
            sa.Column('args_json', sa.Text(), nullable=False),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='pending'),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('resolved_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_ai_pending_actions_facility_id', 'ai_pending_actions', ['facility_id'], unique=False)
        op.create_index('ix_ai_pending_actions_user_id', 'ai_pending_actions', ['user_id'], unique=False)


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if 'ai_pending_actions' in existing_tables:
        op.drop_table('ai_pending_actions')
