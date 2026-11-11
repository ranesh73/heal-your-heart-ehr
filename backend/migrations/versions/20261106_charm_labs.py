"""Add CharmHealth lab orders & results fields: lab_ref, dual notes, metadata, interpretation, comments."""
from alembic import op
import sqlalchemy as sa

revision = '20261106_charm_labs'
down_revision = '20261026_immutable'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    
    # Check clinical_orders columns
    order_cols = [c['name'] for c in insp.get_columns('clinical_orders')]
    with op.batch_alter_table('clinical_orders') as batch_op:
        if 'lab_ref' not in order_cols:
            batch_op.add_column(sa.Column('lab_ref', sa.String(20), server_default='', nullable=True))
        if 'ordered_date' not in order_cols:
            batch_op.add_column(sa.Column('ordered_date', sa.String(30), server_default='', nullable=True))
        if 'notes_lab_patient' not in order_cols:
            batch_op.add_column(sa.Column('notes_lab_patient', sa.Text(), server_default='', nullable=True))
        if 'notes_intra_office' not in order_cols:
            batch_op.add_column(sa.Column('notes_intra_office', sa.Text(), server_default='', nullable=True))
        if 'order_metadata' not in order_cols:
            batch_op.add_column(sa.Column('order_metadata', sa.Text(), server_default='', nullable=True))

    # Check lab_values columns
    val_cols = [c['name'] for c in insp.get_columns('lab_values')]
    with op.batch_alter_table('lab_values') as batch_op:
        if 'test_name' not in val_cols:
            batch_op.add_column(sa.Column('test_name', sa.String(200), server_default='', nullable=True))
        if 'interpretation' not in val_cols:
            batch_op.add_column(sa.Column('interpretation', sa.String(20), server_default='', nullable=True))
        if 'comments' not in val_cols:
            batch_op.add_column(sa.Column('comments', sa.Text(), server_default='', nullable=True))


def downgrade():
    with op.batch_alter_table('clinical_orders') as batch_op:
        batch_op.drop_column('order_metadata')
        batch_op.drop_column('notes_intra_office')
        batch_op.drop_column('notes_lab_patient')
        batch_op.drop_column('ordered_date')
        batch_op.drop_column('lab_ref')

    with op.batch_alter_table('lab_values') as batch_op:
        batch_op.drop_column('comments')
        batch_op.drop_column('interpretation')
        batch_op.drop_column('test_name')

