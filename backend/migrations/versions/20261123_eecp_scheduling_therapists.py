"""Seed EECP facilities, rooms, and therapist rosters for scheduling."""
from alembic import op
from sqlalchemy.orm import Session
from app.scheduling import ensure_eecp_scheduling_seed_data

revision = "20261123_eecp_scheduling_therapists"
down_revision = "20261123_patient_photo_url"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    session = Session(bind=bind)
    try:
        ensure_eecp_scheduling_seed_data(session)
        session.commit()
    except Exception:
        session.rollback()
        raise


def downgrade():
    pass
