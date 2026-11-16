"""merge_migration_heads"""
from alembic import op
import sqlalchemy as sa

revision = 'fee202569492'
down_revision = ('20261113_appointment_token_number', '20261113_repair_injection_columns', '20261113_user_preferences')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass
