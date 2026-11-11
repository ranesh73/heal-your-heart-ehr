"""Add tables for injections, vaccines; extend medications with start_date, end_date, refills, units, MAEN floats; extend vitals with observed_at."""
from alembic import op
import sqlalchemy as sa

revision = '20261110_clinical_workflows'
down_revision = '20261106_charm_labs'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()

    # 1. Create injections table if it doesn't exist
    if 'injections' not in tables:
        op.create_table(
            'injections',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('patient_id', sa.String(36), sa.ForeignKey('patients.id'), nullable=False, index=True),
            sa.Column('facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=False, index=True),
            sa.Column('author_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('encounter_id', sa.String(36), sa.ForeignKey('encounters.id'), nullable=True),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('dose', sa.String(80), server_default='', nullable=True),
            sa.Column('frequency', sa.String(80), server_default='', nullable=True),
            sa.Column('period', sa.Integer(), nullable=True),
            sa.Column('period_unit', sa.String(40), server_default='Day(s)', nullable=True),
            sa.Column('route', sa.String(60), server_default='', nullable=True),
            sa.Column('site', sa.String(80), server_default='', nullable=True),
            sa.Column('lot_number', sa.String(60), server_default='', nullable=True),
            sa.Column('expiration_date', sa.Date(), nullable=True),
            sa.Column('administered_at', sa.DateTime(), nullable=True),
            sa.Column('administered_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('nurse_notes', sa.Text(), server_default='', nullable=True),
            sa.Column('comments', sa.Text(), server_default='', nullable=True),
            sa.Column('status', sa.String(30), server_default='administered', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )

    # 2. Create vaccines table if it doesn't exist
    if 'vaccines' not in tables:
        op.create_table(
            'vaccines',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('patient_id', sa.String(36), sa.ForeignKey('patients.id'), nullable=False, index=True),
            sa.Column('facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=False, index=True),
            sa.Column('author_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('encounter_id', sa.String(36), sa.ForeignKey('encounters.id'), nullable=True),
            sa.Column('vaccine_name', sa.String(200), nullable=False),
            sa.Column('cvx_code', sa.String(30), server_default='', nullable=True),
            sa.Column('lot_number', sa.String(60), server_default='', nullable=True),
            sa.Column('expiration_date', sa.Date(), nullable=True),
            sa.Column('series_number', sa.Integer(), nullable=True),
            sa.Column('dose', sa.String(60), server_default='', nullable=True),
            sa.Column('route', sa.String(60), server_default='', nullable=True),
            sa.Column('site', sa.String(80), server_default='', nullable=True),
            sa.Column('administered_at', sa.DateTime(), nullable=True),
            sa.Column('ordered_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('administered_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('notes', sa.Text(), server_default='', nullable=True),
            sa.Column('status', sa.String(30), server_default='administered', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )

    # 3. Add columns to medications table
    med_cols = [c['name'] for c in insp.get_columns('medications')]
    with op.batch_alter_table('medications') as batch_op:
        if 'start_date' not in med_cols:
            batch_op.add_column(sa.Column('start_date', sa.Date(), nullable=True))
        if 'end_date' not in med_cols:
            batch_op.add_column(sa.Column('end_date', sa.Date(), nullable=True))
        if 'refills' not in med_cols:
            batch_op.add_column(sa.Column('refills', sa.Integer(), server_default='0', nullable=True))
        if 'dose_unit' not in med_cols:
            batch_op.add_column(sa.Column('dose_unit', sa.String(40), server_default='', nullable=True))
        if 'dispense_unit' not in med_cols:
            batch_op.add_column(sa.Column('dispense_unit', sa.String(40), server_default='', nullable=True))
        if 'timing_when' not in med_cols:
            batch_op.add_column(sa.Column('timing_when', sa.String(40), server_default='', nullable=True))
        if 'morning' not in med_cols:
            batch_op.add_column(sa.Column('morning', sa.Float(), server_default='0.0', nullable=True))
        if 'afternoon' not in med_cols:
            batch_op.add_column(sa.Column('afternoon', sa.Float(), server_default='0.0', nullable=True))
        if 'evening' not in med_cols:
            batch_op.add_column(sa.Column('evening', sa.Float(), server_default='0.0', nullable=True))
        if 'night' not in med_cols:
            batch_op.add_column(sa.Column('night', sa.Float(), server_default='0.0', nullable=True))
        if 'is_supplement' not in med_cols:
            batch_op.add_column(sa.Column('is_supplement', sa.Boolean(), server_default='0', nullable=False))

    # 4. Add columns to vitals table
    vital_cols = [c['name'] for c in insp.get_columns('vitals')]
    with op.batch_alter_table('vitals') as batch_op:
        if 'observed_at' not in vital_cols:
            batch_op.add_column(sa.Column('observed_at', sa.DateTime(), nullable=True))

    # 5. Add columns to encounters table
    enc_cols = [c['name'] for c in insp.get_columns('encounters')]
    with op.batch_alter_table('encounters') as batch_op:
        if 'chart_type' not in enc_cols:
            batch_op.add_column(sa.Column('chart_type', sa.String(50), server_default='SOAP Template', nullable=False))
        if 'mode' not in enc_cols:
            batch_op.add_column(sa.Column('mode', sa.String(50), server_default='In Person', nullable=False))
        if 'consult_notes' not in enc_cols:
            batch_op.add_column(sa.Column('consult_notes', sa.Text(), server_default='', nullable=True))
        if 'nurse_notes' not in enc_cols:
            batch_op.add_column(sa.Column('nurse_notes', sa.Text(), server_default='', nullable=True))
        if 'physician_notes' not in enc_cols:
            batch_op.add_column(sa.Column('physician_notes', sa.Text(), server_default='', nullable=True))
        if 'treatment_notes' not in enc_cols:
            batch_op.add_column(sa.Column('treatment_notes', sa.Text(), server_default='', nullable=True))

    # 6. Add columns to facilities table
    fac_cols = [c['name'] for c in insp.get_columns('facilities')]
    with op.batch_alter_table('facilities') as batch_op:
        if 'phone' not in fac_cols:
            batch_op.add_column(sa.Column('phone', sa.String(50), server_default='', nullable=True))
        if 'mobile' not in fac_cols:
            batch_op.add_column(sa.Column('mobile', sa.String(50), server_default='', nullable=True))


def downgrade():
    with op.batch_alter_table('encounters') as batch_op:
        batch_op.drop_column('treatment_notes')
        batch_op.drop_column('physician_notes')
        batch_op.drop_column('nurse_notes')
        batch_op.drop_column('consult_notes')
        batch_op.drop_column('mode')
        batch_op.drop_column('chart_type')
    op.drop_table('vaccines')
    op.drop_table('injections')
    with op.batch_alter_table('medications') as batch_op:
        batch_op.drop_column('is_supplement')
        batch_op.drop_column('night')
        batch_op.drop_column('evening')
        batch_op.drop_column('afternoon')
        batch_op.drop_column('morning')
        batch_op.drop_column('timing_when')
        batch_op.drop_column('dispense_unit')
        batch_op.drop_column('dose_unit')
        batch_op.drop_column('refills')
        batch_op.drop_column('end_date')
        batch_op.drop_column('start_date')
    with op.batch_alter_table('vitals') as batch_op:
        batch_op.drop_column('observed_at')
