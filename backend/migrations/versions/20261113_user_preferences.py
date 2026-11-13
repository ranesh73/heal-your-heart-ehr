"""Add user_preferences table for persistent user-scoped settings.

Revision ID: 20261113_user_preferences
Revises: 20261113_rx_supplements_and_drugs
Create Date: 2026-11-13 11:38:00
"""
from alembic import op
import sqlalchemy as sa

revision = '20261113_user_preferences'
down_revision = '20261113_rx_supplements_and_drugs'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()

    if 'user_preferences' not in tables:
        op.create_table(
            'user_preferences',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=True),
            sa.Column('section', sa.String(60), nullable=False, index=True),
            sa.Column('data', sa.Text(), server_default='{}', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
            sa.UniqueConstraint('user_id', 'section', name='uq_user_preference_section')
        )


def downgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()
    if 'user_preferences' in tables:
        op.drop_table('user_preferences')

