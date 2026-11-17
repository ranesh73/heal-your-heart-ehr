"""auth_staff_and_otp

Revision ID: 20261117_auth_staff_and_otp
Revises: fee202569492
Create Date: 2026-11-17 12:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = '20261117_auth_staff_and_otp'
down_revision = 'fee202569492'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    user_cols = [c['name'] for c in inspector.get_columns('users')]
    
    if 'phone' not in user_cols:
        op.add_column('users', sa.Column('phone', sa.String(length=40), nullable=True))
    if 'title' not in user_cols:
        op.add_column('users', sa.Column('title', sa.String(length=100), nullable=True))

    tables = inspector.get_table_names()
    if 'otp_tokens' not in tables:
        op.create_table(
            'otp_tokens',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('identifier', sa.String(length=160), nullable=False, index=True),
            sa.Column('otp_hash', sa.String(length=64), nullable=False),
            sa.Column('purpose', sa.String(length=40), nullable=False, default='password_reset'),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('attempts', sa.Integer(), nullable=False, default=0),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False, default=1),
        )

    if 'signup_requests' not in tables:
        op.create_table(
            'signup_requests',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('first_name', sa.String(length=80), nullable=False),
            sa.Column('last_name', sa.String(length=80), nullable=False),
            sa.Column('email', sa.String(length=160), nullable=False, index=True),
            sa.Column('phone', sa.String(length=40), nullable=False),
            sa.Column('practice_name', sa.String(length=160), nullable=False),
            sa.Column('specialty', sa.String(length=100), nullable=False),
            sa.Column('status', sa.String(length=30), nullable=False, default='pending_approval'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False, default=1),
        )


def downgrade():
    pass
