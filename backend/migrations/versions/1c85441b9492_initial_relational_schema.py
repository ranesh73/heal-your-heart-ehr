"""initial_relational_schema"""
from alembic import op
import sqlalchemy as sa

revision = '1c85441b9492'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('facilities',
    sa.Column('code', sa.String(length=20), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code')
    )

    op.create_table('login_attempts',
    sa.Column('key', sa.String(length=64), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('login_attempts', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_login_attempts_key'), ['key'], unique=False)

    op.create_table('sequences',
    sa.Column('key', sa.String(length=80), nullable=False),
    sa.Column('value', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('key')
    )

    op.create_table('users',
    sa.Column('email', sa.String(length=160), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('role', sa.String(length=24), nullable=False),
    sa.Column('password_hash', sa.String(length=300), nullable=False),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint("role IN ('admin','doctor','assistant','therapist','reception','billing')"),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )

    op.create_table('audit_events',
    sa.Column('facility_id', sa.String(length=36), nullable=True),
    sa.Column('actor_id', sa.String(length=36), nullable=True),
    sa.Column('action', sa.String(length=80), nullable=False),
    sa.Column('entity_type', sa.String(length=80), nullable=False),
    sa.Column('entity_id', sa.String(length=36), nullable=False),
    sa.Column('detail', sa.Text(), nullable=True),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('audit_events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_audit_events_facility_id'), ['facility_id'], unique=False)

    op.create_table('availability',
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('weekday', sa.Integer(), nullable=False),
    sa.Column('start_minute', sa.Integer(), nullable=False),
    sa.Column('end_minute', sa.Integer(), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint('start_minute >= 0 AND end_minute <= 1440 AND start_minute < end_minute'),
    sa.CheckConstraint('weekday BETWEEN 0 AND 6'),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('availability', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_availability_facility_id'), ['facility_id'], unique=False)

    op.create_table('catalogs',
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('kind', sa.String(length=30), nullable=False),
    sa.Column('code', sa.String(length=60), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('content', sa.Text(), nullable=True),
    sa.Column('price_paise', sa.Integer(), nullable=False),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint('price_paise >= 0'),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('facility_id', 'kind', 'code')
    )
    with op.batch_alter_table('catalogs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_catalogs_facility_id'), ['facility_id'], unique=False)

    op.create_table('inventory_items',
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=160), nullable=False),
    sa.Column('category', sa.String(length=100), nullable=False),
    sa.Column('supplier', sa.String(length=160), nullable=True),
    sa.Column('reorder_level', sa.Integer(), nullable=False),
    sa.Column('unit', sa.String(length=20), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('inventory_items', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_inventory_items_facility_id'), ['facility_id'], unique=False)

    op.create_table('jobs',
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('kind', sa.String(length=30), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('result', sa.Text(), nullable=True),
    sa.Column('completed_at', sa.DateTime(), nullable=True),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('patients',
    sa.Column('mrn', sa.String(length=40), nullable=False),
    sa.Column('first_name', sa.String(length=80), nullable=False),
    sa.Column('last_name', sa.String(length=80), nullable=False),
    sa.Column('dob', sa.Date(), nullable=False),
    sa.Column('sex', sa.String(length=20), nullable=False),
    sa.Column('primary_facility_id', sa.String(length=36), nullable=False),
    sa.Column('provider_id', sa.String(length=36), nullable=True),
    sa.Column('blood_group', sa.String(length=10), nullable=True),
    sa.Column('phone', sa.String(length=30), nullable=True),
    sa.Column('email', sa.String(length=160), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('area', sa.String(length=100), nullable=True),
    sa.Column('city', sa.String(length=100), nullable=True),
    sa.Column('district', sa.String(length=100), nullable=True),
    sa.Column('state', sa.String(length=100), nullable=True),
    sa.Column('postal_code', sa.String(length=12), nullable=True),
    sa.Column('residency', sa.String(length=30), nullable=True),
    sa.Column('emergency_name', sa.String(length=100), nullable=True),
    sa.Column('emergency_phone', sa.String(length=30), nullable=True),
    sa.Column('referral_source', sa.String(length=150), nullable=True),
    sa.Column('communication_opt_in', sa.Boolean(), nullable=False),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['primary_facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['provider_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('mrn')
    )
    with op.batch_alter_table('patients', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_patients_phone'), ['phone'], unique=False)

    op.create_table('resources',
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('kind', sa.String(length=30), nullable=False),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('facility_id', 'name')
    )
    with op.batch_alter_table('resources', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_resources_facility_id'), ['facility_id'], unique=False)

    op.create_table('staff_sessions',
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('csrf', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('token_hash')
    )

    op.create_table('user_facilities',
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('user_id', 'facility_id')
    )

    op.create_table('allergies',
    sa.Column('category', sa.String(length=30), nullable=False),
    sa.Column('allergen', sa.String(length=150), nullable=False),
    sa.Column('severity', sa.String(length=30), nullable=False),
    sa.Column('reaction', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('allergies', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_allergies_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_allergies_patient_id'), ['patient_id'], unique=False)

    op.create_table('eecp_plans',
    sa.Column('program', sa.String(length=120), nullable=False),
    sa.Column('session_count', sa.Integer(), nullable=False),
    sa.Column('therapist_id', sa.String(length=36), nullable=False),
    sa.Column('start_date', sa.Date(), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('authorized_by', sa.String(length=36), nullable=True),
    sa.Column('authorized_at', sa.DateTime(), nullable=True),
    sa.Column('consent_document_id', sa.String(length=36), nullable=True),
    sa.Column('consent_recorded_at', sa.DateTime(), nullable=True),
    sa.Column('consent_recorded_by', sa.String(length=36), nullable=True),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint('session_count BETWEEN 1 AND 100'),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['authorized_by'], ['users.id'], ),
    *([sa.ForeignKeyConstraint(['consent_document_id'], ['documents.id'], name='fk_plan_consent_document')] if op.get_bind().dialect.name == 'sqlite' else []),
    sa.ForeignKeyConstraint(['consent_recorded_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['therapist_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('eecp_plans', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_eecp_plans_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_eecp_plans_patient_id'), ['patient_id'], unique=False)

    op.create_table('histories',
    sa.Column('category', sa.String(length=40), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('event_date', sa.Date(), nullable=True),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('histories', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_histories_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_histories_patient_id'), ['patient_id'], unique=False)

    op.create_table('messages',
    sa.Column('recipient_id', sa.String(length=36), nullable=False),
    sa.Column('subject', sa.String(length=200), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('read_at', sa.DateTime(), nullable=True),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_messages_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_messages_patient_id'), ['patient_id'], unique=False)

    op.create_table('patient_entries',
    sa.Column('kind', sa.String(length=30), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('patient_entries', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_patient_entries_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_patient_entries_patient_id'), ['patient_id'], unique=False)

    op.create_table('patient_facilities',
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('patient_id', 'facility_id')
    )

    op.create_table('stock_movements',
    sa.Column('item_id', sa.String(length=36), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('reason', sa.String(length=240), nullable=False),
    sa.Column('actor_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['item_id'], ['inventory_items.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('stock_movements', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_stock_movements_item_id'), ['item_id'], unique=False)

    op.create_table('tasks',
    sa.Column('kind', sa.String(length=30), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('body', sa.Text(), nullable=True),
    sa.Column('assignee_id', sa.String(length=36), nullable=False),
    sa.Column('due_date', sa.Date(), nullable=True),
    sa.Column('priority', sa.String(length=20), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['assignee_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_tasks_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_tasks_patient_id'), ['patient_id'], unique=False)

    op.create_table('appointments',
    sa.Column('provider_id', sa.String(length=36), nullable=False),
    sa.Column('resource_id', sa.String(length=36), nullable=True),
    sa.Column('plan_id', sa.String(length=36), nullable=True),
    sa.Column('session_number', sa.Integer(), nullable=True),
    sa.Column('series_id', sa.String(length=36), nullable=True),
    sa.Column('start_at', sa.DateTime(), nullable=False),
    sa.Column('end_at', sa.DateTime(), nullable=False),
    sa.Column('visit_type', sa.String(length=80), nullable=False),
    sa.Column('mode', sa.String(length=30), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('checked_in_at', sa.DateTime(), nullable=True),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint('end_at > start_at'),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['plan_id'], ['eecp_plans.id'], ),
    sa.ForeignKeyConstraint(['provider_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['resource_id'], ['resources.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('plan_id', 'session_number')
    )
    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_appointments_end_at'), ['end_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_appointments_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_appointments_patient_id'), ['patient_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_appointments_plan_id'), ['plan_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_appointments_provider_id'), ['provider_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_appointments_resource_id'), ['resource_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_appointments_start_at'), ['start_at'], unique=False)

    op.create_table('eecp_weekly_assessments',
    sa.Column('plan_id', sa.String(length=36), nullable=False),
    sa.Column('week_number', sa.Integer(), nullable=False),
    sa.Column('weight_kg', sa.Float(), nullable=True),
    sa.Column('height_cm', sa.Float(), nullable=True),
    sa.Column('bp_sys', sa.Float(), nullable=True),
    sa.Column('bp_dia', sa.Float(), nullable=True),
    sa.Column('pulse_bpm', sa.Float(), nullable=True),
    sa.Column('exercise_minutes', sa.Float(), nullable=True),
    sa.Column('walk_distance_m', sa.Float(), nullable=True),
    sa.Column('nyha_class', sa.String(length=5), nullable=False),
    sa.Column('ccs_class', sa.String(length=5), nullable=False),
    sa.Column('pre_glucose', sa.Float(), nullable=True),
    sa.Column('post_glucose', sa.Float(), nullable=True),
    sa.Column('water_ml', sa.Float(), nullable=True),
    sa.Column('qol_score', sa.Integer(), nullable=False),
    sa.Column('physician_evaluation', sa.Text(), nullable=True),
    sa.Column('physician_id', sa.String(length=36), nullable=True),
    sa.Column('reviewed_at', sa.DateTime(), nullable=True),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint('qol_score BETWEEN 0 AND 4'),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['physician_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['plan_id'], ['eecp_plans.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('plan_id', 'week_number')
    )
    with op.batch_alter_table('eecp_weekly_assessments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_eecp_weekly_assessments_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_eecp_weekly_assessments_patient_id'), ['patient_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_eecp_weekly_assessments_plan_id'), ['plan_id'], unique=False)

    op.create_table('eecp_daily_sessions',
    sa.Column('plan_id', sa.String(length=36), nullable=False),
    sa.Column('appointment_id', sa.String(length=36), nullable=False),
    sa.Column('therapist_id', sa.String(length=36), nullable=False),
    sa.Column('resource_id', sa.String(length=36), nullable=False),
    sa.Column('session_number', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('started_at', sa.DateTime(), nullable=False),
    sa.Column('completed_at', sa.DateTime(), nullable=True),
    sa.Column('pre_o2_l', sa.Float(), nullable=True),
    sa.Column('pre_weight_kg', sa.Float(), nullable=True),
    sa.Column('pre_bp_sys', sa.Float(), nullable=True),
    sa.Column('pre_bp_dia', sa.Float(), nullable=True),
    sa.Column('pre_hr', sa.Float(), nullable=True),
    sa.Column('pre_spo2', sa.Float(), nullable=True),
    sa.Column('min15_ds_peak', sa.Float(), nullable=True),
    sa.Column('min15_ds_area', sa.Float(), nullable=True),
    sa.Column('min15_hr', sa.Float(), nullable=True),
    sa.Column('min15_pressure', sa.Float(), nullable=True),
    sa.Column('min45_ds_peak', sa.Float(), nullable=True),
    sa.Column('min45_ds_area', sa.Float(), nullable=True),
    sa.Column('min45_hr', sa.Float(), nullable=True),
    sa.Column('min45_pressure', sa.Float(), nullable=True),
    sa.Column('pressure_unit', sa.String(length=10), nullable=False),
    sa.Column('observations', sa.Text(), nullable=True),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['plan_id'], ['eecp_plans.id'], ),
    sa.ForeignKeyConstraint(['resource_id'], ['resources.id'], ),
    sa.ForeignKeyConstraint(['therapist_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('appointment_id'),
    sa.UniqueConstraint('plan_id', 'session_number')
    )
    with op.batch_alter_table('eecp_daily_sessions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_eecp_daily_sessions_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_eecp_daily_sessions_patient_id'), ['patient_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_eecp_daily_sessions_plan_id'), ['plan_id'], unique=False)

    op.create_table('encounters',
    sa.Column('provider_id', sa.String(length=36), nullable=False),
    sa.Column('assistant_id', sa.String(length=36), nullable=True),
    sa.Column('appointment_id', sa.String(length=36), nullable=True),
    sa.Column('visit_type', sa.String(length=80), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('chief_complaint', sa.Text(), nullable=True),
    sa.Column('hpi', sa.Text(), nullable=True),
    sa.Column('medical_history', sa.Text(), nullable=True),
    sa.Column('ros', sa.Text(), nullable=True),
    sa.Column('objective', sa.Text(), nullable=True),
    sa.Column('examination', sa.Text(), nullable=True),
    sa.Column('assessment', sa.Text(), nullable=True),
    sa.Column('plan', sa.Text(), nullable=True),
    sa.Column('follow_up', sa.Text(), nullable=True),
    sa.Column('outcome', sa.String(length=100), nullable=True),
    sa.Column('cad_year', sa.Integer(), nullable=True),
    sa.Column('cabg', sa.Text(), nullable=True),
    sa.Column('cag', sa.Text(), nullable=True),
    sa.Column('ccs_class', sa.String(length=5), nullable=True),
    sa.Column('signed_at', sa.DateTime(), nullable=True),
    sa.Column('signed_by', sa.String(length=36), nullable=True),
    sa.Column('signature_digest', sa.String(length=64), nullable=True),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint("status IN ('draft','signed')"),
    sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
    sa.ForeignKeyConstraint(['assistant_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['provider_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['signed_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('appointment_id')
    )
    with op.batch_alter_table('encounters', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_encounters_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_encounters_patient_id'), ['patient_id'], unique=False)

    op.create_table('amendments',
    sa.Column('encounter_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['encounter_id'], ['encounters.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('amendments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_amendments_encounter_id'), ['encounter_id'], unique=False)

    op.create_table('carry_forwards',
    sa.Column('encounter_id', sa.String(length=36), nullable=False),
    sa.Column('source_id', sa.String(length=36), nullable=False),
    sa.Column('section', sa.String(length=40), nullable=False),
    sa.Column('source_date', sa.DateTime(), nullable=False),
    sa.Column('actor_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['encounter_id'], ['encounters.id'], ),
    sa.ForeignKeyConstraint(['source_id'], ['encounters.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('clinical_orders',
    sa.Column('encounter_id', sa.String(length=36), nullable=True),
    sa.Column('kind', sa.String(length=30), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('instructions', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('result', sa.Text(), nullable=True),
    sa.Column('reviewed_by', sa.String(length=36), nullable=True),
    sa.Column('reviewed_at', sa.DateTime(), nullable=True),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['encounter_id'], ['encounters.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('clinical_orders', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_clinical_orders_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_clinical_orders_patient_id'), ['patient_id'], unique=False)

    op.create_table('diagnoses',
    sa.Column('encounter_id', sa.String(length=36), nullable=True),
    sa.Column('code', sa.String(length=30), nullable=True),
    sa.Column('description', sa.String(length=240), nullable=False),
    sa.Column('onset', sa.Date(), nullable=True),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['encounter_id'], ['encounters.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('diagnoses', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_diagnoses_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_diagnoses_patient_id'), ['patient_id'], unique=False)

    op.create_table('encounter_symptoms',
    sa.Column('encounter_id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('response', sa.String(length=20), nullable=False),
    sa.Column('narrative', sa.Text(), nullable=True),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['encounter_id'], ['encounters.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('encounter_id', 'name')
    )
    with op.batch_alter_table('encounter_symptoms', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_encounter_symptoms_encounter_id'), ['encounter_id'], unique=False)

    op.create_table('invoices',
    sa.Column('number', sa.String(length=50), nullable=False),
    sa.Column('encounter_id', sa.String(length=36), nullable=True),
    sa.Column('discount_paise', sa.Integer(), nullable=False),
    sa.Column('total_paise', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint('total_paise >= 0 AND discount_paise >= 0'),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['encounter_id'], ['encounters.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('number')
    )
    with op.batch_alter_table('invoices', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_invoices_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_invoices_patient_id'), ['patient_id'], unique=False)

    op.create_table('medications',
    sa.Column('encounter_id', sa.String(length=36), nullable=True),
    sa.Column('trade_name', sa.String(length=120), nullable=False),
    sa.Column('generic_name', sa.String(length=120), nullable=True),
    sa.Column('dose', sa.String(length=80), nullable=False),
    sa.Column('route', sa.String(length=40), nullable=False),
    sa.Column('frequency', sa.String(length=80), nullable=True),
    sa.Column('maen', sa.String(length=40), nullable=False),
    sa.Column('timing', sa.String(length=40), nullable=True),
    sa.Column('duration_days', sa.Integer(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('substitution_allowed', sa.Boolean(), nullable=False),
    sa.Column('instructions', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint('quantity > 0 AND duration_days > 0'),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['encounter_id'], ['encounters.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('medications', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_medications_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_medications_patient_id'), ['patient_id'], unique=False)

    op.create_table('note_revisions',
    sa.Column('encounter_id', sa.String(length=36), nullable=False),
    sa.Column('actor_id', sa.String(length=36), nullable=False),
    sa.Column('action', sa.String(length=30), nullable=False),
    sa.Column('snapshot', sa.Text(), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['encounter_id'], ['encounters.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('note_revisions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_note_revisions_encounter_id'), ['encounter_id'], unique=False)

    op.create_table('vitals',
    sa.Column('encounter_id', sa.String(length=36), nullable=True),
    sa.Column('weight_kg', sa.Float(), nullable=True),
    sa.Column('height_cm', sa.Float(), nullable=True),
    sa.Column('waist_in', sa.Float(), nullable=True),
    sa.Column('bmi_percentile', sa.Float(), nullable=True),
    sa.Column('bp_sys', sa.Float(), nullable=True),
    sa.Column('bp_dia', sa.Float(), nullable=True),
    sa.Column('pulse_bpm', sa.Float(), nullable=True),
    sa.Column('pulse_pattern', sa.String(length=80), nullable=True),
    sa.Column('pulse_volume', sa.String(length=80), nullable=True),
    sa.Column('spo2_pct', sa.Float(), nullable=True),
    sa.Column('temperature_f', sa.Float(), nullable=True),
    sa.Column('respiration_rate', sa.Float(), nullable=True),
    sa.Column('respiration_pattern', sa.String(length=80), nullable=True),
    sa.Column('central_sys', sa.Float(), nullable=True),
    sa.Column('central_dia', sa.Float(), nullable=True),
    sa.Column('cr_pwv', sa.Float(), nullable=True),
    sa.Column('cf_pwv', sa.Float(), nullable=True),
    sa.Column('vascular_age', sa.Float(), nullable=True),
    sa.Column('hba1c_pct', sa.Float(), nullable=True),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['encounter_id'], ['encounters.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('vitals', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_vitals_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_vitals_patient_id'), ['patient_id'], unique=False)

    op.create_table('credits',
    sa.Column('invoice_id', sa.String(length=36), nullable=False),
    sa.Column('amount_paise', sa.Integer(), nullable=False),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('actor_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint('amount_paise > 0'),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('documents',
    sa.Column('title', sa.String(length=180), nullable=False),
    sa.Column('filename', sa.String(length=180), nullable=False),
    sa.Column('storage_key', sa.String(length=36), nullable=False),
    sa.Column('mime', sa.String(length=80), nullable=False),
    sa.Column('size', sa.Integer(), nullable=False),
    sa.Column('sha256', sa.String(length=64), nullable=False),
    sa.Column('order_id', sa.String(length=36), nullable=True),
    sa.Column('patient_id', sa.String(length=36), nullable=False),
    sa.Column('facility_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
    sa.ForeignKeyConstraint(['order_id'], ['clinical_orders.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('storage_key')
    )
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_documents_facility_id'), ['facility_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_documents_patient_id'), ['patient_id'], unique=False)

    op.create_table('invoice_lines',
    sa.Column('invoice_id', sa.String(length=36), nullable=False),
    sa.Column('code', sa.String(length=50), nullable=True),
    sa.Column('description', sa.String(length=200), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('unit_paise', sa.Integer(), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint('quantity > 0 AND unit_paise >= 0'),
    sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('invoice_lines', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_invoice_lines_invoice_id'), ['invoice_id'], unique=False)

    op.create_table('lab_values',
    sa.Column('order_id', sa.String(length=36), nullable=False),
    sa.Column('parameter', sa.String(length=100), nullable=False),
    sa.Column('value', sa.String(length=100), nullable=False),
    sa.Column('unit', sa.String(length=40), nullable=True),
    sa.Column('reference_range', sa.String(length=100), nullable=True),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['order_id'], ['clinical_orders.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('lab_values', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_lab_values_order_id'), ['order_id'], unique=False)

    op.create_table('payments',
    sa.Column('invoice_id', sa.String(length=36), nullable=False),
    sa.Column('receipt_number', sa.String(length=50), nullable=False),
    sa.Column('amount_paise', sa.Integer(), nullable=False),
    sa.Column('mode', sa.String(length=20), nullable=False),
    sa.Column('actor_id', sa.String(length=36), nullable=False),
    sa.Column('idempotency_key', sa.String(length=80), nullable=False),
    sa.Column('simulated', sa.Boolean(), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.CheckConstraint('amount_paise > 0'),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('idempotency_key'),
    sa.UniqueConstraint('receipt_number')
    )
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_payments_invoice_id'), ['invoice_id'], unique=False)
    if op.get_bind().dialect.name != 'sqlite':
        op.create_foreign_key('fk_plan_consent_document','eecp_plans','documents',['consent_document_id'],['id'])

def downgrade():
    if op.get_bind().dialect.name != 'sqlite':
        op.drop_constraint('fk_plan_consent_document','eecp_plans',type_='foreignkey')
    op.drop_table('payments')
    op.drop_table('lab_values')
    op.drop_table('invoice_lines')
    op.drop_table('documents')
    op.drop_table('credits')
    op.drop_table('vitals')
    op.drop_table('note_revisions')
    op.drop_table('medications')
    op.drop_table('invoices')
    op.drop_table('encounter_symptoms')
    op.drop_table('diagnoses')
    op.drop_table('clinical_orders')
    op.drop_table('carry_forwards')
    op.drop_table('amendments')
    op.drop_table('encounters')
    op.drop_table('eecp_daily_sessions')
    op.drop_table('eecp_weekly_assessments')
    op.drop_table('appointments')
    op.drop_table('tasks')
    op.drop_table('stock_movements')
    op.drop_table('patient_facilities')
    op.drop_table('patient_entries')
    op.drop_table('messages')
    op.drop_table('histories')
    op.drop_table('eecp_plans')
    op.drop_table('allergies')
    op.drop_table('user_facilities')
    op.drop_table('staff_sessions')
    op.drop_table('resources')
    op.drop_table('patients')
    op.drop_table('jobs')
    op.drop_table('inventory_items')
    op.drop_table('catalogs')
    op.drop_table('availability')
    op.drop_table('audit_events')
    op.drop_table('users')
    op.drop_table('sequences')
    op.drop_table('login_attempts')
    op.drop_table('facilities')
