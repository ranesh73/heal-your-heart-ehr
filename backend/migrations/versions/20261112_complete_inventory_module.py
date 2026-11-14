"""Add complete inventory module tables: suppliers, categories, batches, medicine catalogs, report exports, and extended columns for inventory_items and stock_movements."""
from alembic import op
import sqlalchemy as sa

revision = '20261112_complete_inventory_module'
down_revision = '20261112_inventory_injections'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()

    # 1. Extend inventory_items
    if 'inventory_items' in tables:
        cols = [c['name'] for c in insp.get_columns('inventory_items')]
        new_cols = [
            ('group_name', sa.String(100), 'Drug'),
            ('product_code', sa.String(80), ''),
            ('hsn_code', sa.String(40), ''),
            ('trade_name', sa.String(200), ''),
            ('strength', sa.String(60), ''),
            ('strength_unit', sa.String(40), ''),
            ('route', sa.String(60), ''),
            ('dose_form', sa.String(60), 'Tablet'),
            ('tax_percent', sa.Float(), 0.0),
            ('order_quantity', sa.Integer(), 0),
            ('cost_price', sa.Float(), 0.0),
            ('retail_price', sa.Float(), 0.0),
            ('is_active', sa.Boolean(), 1),
            ('manufacturer', sa.String(200), ''),
        ]
        for name, col_type, default_val in new_cols:
            if name not in cols:
                op.add_column('inventory_items', sa.Column(name, col_type, server_default=str(default_val) if not isinstance(default_val, str) or default_val else f"'{default_val}'", nullable=True))

    # 2. inventory_suppliers
    if 'inventory_suppliers' not in tables:
        op.create_table(
            'inventory_suppliers',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=False, index=True),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('contact_person', sa.String(120), server_default='', nullable=True),
            sa.Column('work_phone', sa.String(40), server_default='', nullable=True),
            sa.Column('mobile_phone', sa.String(40), server_default='', nullable=True),
            sa.Column('fax', sa.String(40), server_default='', nullable=True),
            sa.Column('address', sa.Text(), server_default='', nullable=True),
            sa.Column('city', sa.String(100), server_default='', nullable=True),
            sa.Column('state', sa.String(100), server_default='', nullable=True),
            sa.Column('postal_code', sa.String(20), server_default='', nullable=True),
            sa.Column('country', sa.String(100), server_default='India', nullable=True),
            sa.Column('email', sa.String(160), server_default='', nullable=True),
            sa.Column('notes', sa.Text(), server_default='', nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )

    # 3. inventory_categories
    if 'inventory_categories' not in tables:
        op.create_table(
            'inventory_categories',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=False, index=True),
            sa.Column('name', sa.String(100), nullable=False),
            sa.Column('group_name', sa.String(100), nullable=False),
            sa.Column('description', sa.Text(), server_default='', nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )

    # 4. inventory_batches
    if 'inventory_batches' not in tables:
        op.create_table(
            'inventory_batches',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=False, index=True),
            sa.Column('item_id', sa.String(36), sa.ForeignKey('inventory_items.id'), nullable=False, index=True),
            sa.Column('batch_number', sa.String(80), nullable=False),
            sa.Column('expiry_date', sa.Date(), nullable=True),
            sa.Column('received_date', sa.Date(), nullable=True),
            sa.Column('supplier_id', sa.String(36), nullable=True),
            sa.Column('supplier_name', sa.String(200), server_default='', nullable=True),
            sa.Column('manufacturer', sa.String(200), server_default='', nullable=True),
            sa.Column('cost_price', sa.Float(), server_default='0', nullable=False),
            sa.Column('retail_price', sa.Float(), server_default='0', nullable=False),
            sa.Column('storage_location', sa.String(100), server_default='', nullable=True),
            sa.Column('pack', sa.String(80), server_default='', nullable=True),
            sa.Column('reference_number', sa.String(100), server_default='', nullable=True),
            sa.Column('initial_quantity', sa.Integer(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )

    # 5. Extend stock_movements
    if 'stock_movements' in tables:
        sm_cols = [c['name'] for c in insp.get_columns('stock_movements')]
        sm_new = [
            ('batch_id', sa.String(36), None),
            ('batch_number', sa.String(80), ''),
            ('movement_type', sa.String(40), 'received'),
            ('facility_id', sa.String(36), None),
            ('reference', sa.String(120), ''),
        ]
        for name, col_type, default_val in sm_new:
            if name not in sm_cols:
                op.add_column('stock_movements', sa.Column(name, col_type, server_default=f"'{default_val}'" if default_val is not None else None, nullable=True))

    # 6. medicine_catalogs
    if 'medicine_catalogs' not in tables:
        op.create_table(
            'medicine_catalogs',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('product_name', sa.String(250), nullable=False),
            sa.Column('trade_name', sa.String(250), nullable=False),
            sa.Column('normalized_name', sa.String(250), nullable=False, index=True),
            sa.Column('normalized_trade', sa.String(250), nullable=False, index=True),
            sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )

    # 7. inventory_report_exports
    if 'inventory_report_exports' not in tables:
        op.create_table(
            'inventory_report_exports',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=False, index=True),
            sa.Column('report_name', sa.String(120), nullable=False),
            sa.Column('requested_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('requested_by_name', sa.String(120), server_default='', nullable=True),
            sa.Column('date_range', sa.String(100), server_default='', nullable=True),
            sa.Column('status', sa.String(30), server_default='Ready', nullable=False),
            sa.Column('file_path', sa.String(255), server_default='', nullable=True),
            sa.Column('record_count', sa.Integer(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        )


def downgrade():
    op.drop_table('inventory_report_exports')
    op.drop_table('medicine_catalogs')
    op.drop_table('inventory_batches')
    op.drop_table('inventory_categories')
    op.drop_table('inventory_suppliers')

