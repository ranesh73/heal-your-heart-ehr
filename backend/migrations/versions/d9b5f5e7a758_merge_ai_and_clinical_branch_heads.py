"""merge ai and clinical branch heads"""
from alembic import op
import sqlalchemy as sa

revision = 'd9b5f5e7a758'
down_revision = ('20261118_ai_pending_actions', '20261118_patient_quick_notes')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass
