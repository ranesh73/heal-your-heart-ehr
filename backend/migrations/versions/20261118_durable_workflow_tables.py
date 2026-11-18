"""durable_workflow_tables

Revision ID: 20261118_durable_workflow_tables
Revises: 20261117_patient_billing_actions_metadata
Create Date: 2026-11-18 11:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '20261118_durable_workflow_tables'
down_revision = '20261117_patient_billing_actions_metadata'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    # 1. workflow_instances
    if 'workflow_instances' not in existing_tables:
        op.create_table(
            'workflow_instances',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('facility_id', sa.String(36), sa.ForeignKey('facilities.id'), nullable=False, index=True),
            sa.Column('patient_id', sa.String(36), sa.ForeignKey('patients.id'), nullable=False, index=True),
            sa.Column('appointment_id', sa.String(36), sa.ForeignKey('appointments.id'), nullable=False, index=True),
            sa.Column('template_key', sa.String(50), nullable=False),
            sa.Column('template_version', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('status', sa.String(30), nullable=False, server_default='active'),
            sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.UniqueConstraint('appointment_id', 'template_key', name='uq_wf_instance_appointment_template')
        )

    # 2. workflow_steps
    if 'workflow_steps' not in existing_tables:
        op.create_table(
            'workflow_steps',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('instance_id', sa.String(36), sa.ForeignKey('workflow_instances.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('step_key', sa.String(50), nullable=False),
            sa.Column('step_type', sa.String(30), nullable=False),
            sa.Column('assignee_role', sa.String(30), nullable=False),
            sa.Column('assigned_user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('status', sa.String(30), nullable=False, server_default='pending'),
            sa.Column('required', sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column('due_at', sa.DateTime(), nullable=True),
            sa.Column('task_id', sa.String(36), sa.ForeignKey('tasks.id'), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True)
        )

    # 3. step_dependencies
    if 'step_dependencies' not in existing_tables:
        op.create_table(
            'step_dependencies',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('step_id', sa.String(36), sa.ForeignKey('workflow_steps.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('depends_on_step_id', sa.String(36), sa.ForeignKey('workflow_steps.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.UniqueConstraint('step_id', 'depends_on_step_id', name='uq_step_dependencies')
        )

    # 4. workflow_events
    if 'workflow_events' not in existing_tables:
        op.create_table(
            'workflow_events',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('instance_id', sa.String(36), sa.ForeignKey('workflow_instances.id'), nullable=False, index=True),
            sa.Column('step_id', sa.String(36), sa.ForeignKey('workflow_steps.id'), nullable=True, index=True),
            sa.Column('event_type', sa.String(50), nullable=False),
            sa.Column('actor_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('actor_type', sa.String(20), nullable=False),
            sa.Column('timestamp', sa.DateTime(), nullable=False)
        )


def downgrade():
    pass
