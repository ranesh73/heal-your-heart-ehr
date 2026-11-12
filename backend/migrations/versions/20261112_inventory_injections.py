"""Add tables for injection catalogs, orders, templates, and inventory requisitions; link injections with catalogue_id and order_id."""
from alembic import op
import sqlalchemy as sa

revision = '20261112_inventory_injections'
down_revision = '20261110_clinical_workflows'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()

    # 1. injection_catalogs
    if 'injection_catalogs' not in tables:
        op.create_table(
            'injection_catalogs',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('normalized_name', sa.String(200), nullable=False, index=True),
            sa.Column('original_source_name', sa.String(200), server_default='', nullable=True),
            sa.Column('verification_status', sa.String(40), server_default='verified', nullable=False),
            sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )

    # 2. injection_orders
    if 'injection_orders' not in tables:
        op.create_table(
            'injection_orders',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('patient_id', sa.String(36), sa.ForeignKey('patients.id'), nullable=False, index=True),
            sa.Column('facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=False, index=True),
            sa.Column('author_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('encounter_id', sa.String(36), sa.ForeignKey('encounters.id'), nullable=True),
            sa.Column('catalogue_id', sa.String(36), sa.ForeignKey('injection_catalogs.id'), nullable=True),
            sa.Column('medication_name_snapshot', sa.String(200), nullable=False),
            sa.Column('dosage', sa.String(80), server_default='', nullable=True),
            sa.Column('route', sa.String(60), server_default='', nullable=True),
            sa.Column('site', sa.String(80), server_default='', nullable=True),
            sa.Column('frequency', sa.String(80), server_default='', nullable=True),
            sa.Column('nurse_note', sa.Text(), server_default='', nullable=True),
            sa.Column('comments', sa.Text(), server_default='', nullable=True),
            sa.Column('status', sa.String(30), server_default='pending', nullable=False),
            sa.Column('ordered_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('ordered_at', sa.DateTime(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )

    # 3. injection_templates
    if 'injection_templates' not in tables:
        op.create_table(
            'injection_templates',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=True, index=True),
            sa.Column('template_name', sa.String(160), nullable=False),
            sa.Column('catalogue_id', sa.String(36), sa.ForeignKey('injection_catalogs.id'), nullable=True),
            sa.Column('medication_name', sa.String(200), nullable=False),
            sa.Column('dosage', sa.String(80), server_default='', nullable=True),
            sa.Column('route', sa.String(60), server_default='', nullable=True),
            sa.Column('site', sa.String(80), server_default='', nullable=True),
            sa.Column('frequency', sa.String(80), server_default='', nullable=True),
            sa.Column('nurse_instructions', sa.Text(), server_default='', nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )

    # 4. inventory_requisitions
    if 'inventory_requisitions' not in tables:
        op.create_table(
            'inventory_requisitions',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('source_facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=False),
            sa.Column('destination_facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=False),
            sa.Column('item_name', sa.String(160), nullable=False),
            sa.Column('quantity', sa.Integer(), nullable=False),
            sa.Column('requested_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('status', sa.String(30), server_default='requested', nullable=False),
            sa.Column('notes', sa.Text(), server_default='', nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )

    # 5. Add columns to injections table if missing
    if 'injections' in tables:
        inj_cols = [c['name'] for c in insp.get_columns('injections')]
        with op.batch_alter_table('injections') as batch_op:
            if 'catalogue_id' not in inj_cols:
                batch_op.add_column(sa.Column('catalogue_id', sa.String(36), nullable=True))
            if 'order_id' not in inj_cols:
                batch_op.add_column(sa.Column('order_id', sa.String(36), nullable=True))


def downgrade():
    op.drop_table('inventory_requisitions')
    op.drop_table('injection_templates')
    op.drop_table('injection_orders')
    op.drop_table('injection_catalogs')
