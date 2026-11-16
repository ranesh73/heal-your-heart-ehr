"""Add tables for supplement catalogs, prescription templates, supplement templates, and add catalogue_id to inventory_items and medications."""
from alembic import op
import sqlalchemy as sa

revision = '20261113_rx_supplements_and_drugs'
down_revision = '20261112_complete_inventory_module'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()

    # 1. supplement_catalogs
    if 'supplement_catalogs' not in tables:
        op.create_table(
            'supplement_catalogs',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('name', sa.String(250), nullable=False),
            sa.Column('normalized_name', sa.String(250), nullable=False, index=True),
            sa.Column('dosage_form', sa.String(80), server_default='Tablet', nullable=True),
            sa.Column('strength', sa.String(80), server_default='', nullable=True),
            sa.Column('route', sa.String(60), server_default='Oral', nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )

    # 2. prescription_templates
    if 'prescription_templates' not in tables:
        op.create_table(
            'prescription_templates',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=True, index=True),
            sa.Column('template_name', sa.String(160), nullable=False),
            sa.Column('catalogue_id', sa.String(36), sa.ForeignKey('medicine_catalogs.id'), nullable=True, index=True),
            sa.Column('drug_name', sa.String(250), nullable=False),
            sa.Column('generic_name', sa.String(250), server_default='', nullable=True),
            sa.Column('dosage', sa.String(80), server_default='', nullable=True),
            sa.Column('route', sa.String(60), server_default='Oral', nullable=True),
            sa.Column('frequency', sa.String(80), server_default='', nullable=True),
            sa.Column('maen', sa.String(40), server_default='1-0-0-0', nullable=True),
            sa.Column('duration', sa.String(40), server_default='30 Day(s)', nullable=True),
            sa.Column('instructions', sa.Text(), server_default='', nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )

    # 3. supplement_templates
    if 'supplement_templates' not in tables:
        op.create_table(
            'supplement_templates',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=True, index=True),
            sa.Column('template_name', sa.String(160), nullable=False),
            sa.Column('catalogue_id', sa.String(36), sa.ForeignKey('supplement_catalogs.id'), nullable=True, index=True),
            sa.Column('supplement_name', sa.String(250), nullable=False),
            sa.Column('dosage', sa.String(80), server_default='', nullable=True),
            sa.Column('route', sa.String(60), server_default='Oral', nullable=True),
            sa.Column('frequency', sa.String(80), server_default='', nullable=True),
            sa.Column('duration', sa.String(40), server_default='30 Day(s)', nullable=True),
            sa.Column('instructions', sa.Text(), server_default='', nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )

    # 4. Add catalogue_id to inventory_items
    if 'inventory_items' in tables:
        cols = [c['name'] for c in insp.get_columns('inventory_items')]
        if 'catalogue_id' not in cols:
            op.add_column('inventory_items', sa.Column('catalogue_id', sa.String(36), nullable=True))

    # 5. Add catalogue_id to medications
    if 'medications' in tables:
        cols = [c['name'] for c in insp.get_columns('medications')]
        if 'catalogue_id' not in cols:
            op.add_column('medications', sa.Column('catalogue_id', sa.String(36), nullable=True))


def downgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()

    if 'supplement_templates' in tables:
        op.drop_table('supplement_templates')
    if 'prescription_templates' in tables:
        op.drop_table('prescription_templates')
    if 'supplement_catalogs' in tables:
        op.drop_table('supplement_catalogs')

