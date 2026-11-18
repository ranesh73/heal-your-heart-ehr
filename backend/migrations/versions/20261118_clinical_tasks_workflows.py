"""Add clinical workflow templates, clinical tasks, task comments, and real-time task notifications."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261118_clinical_tasks_workflows"
down_revision = "20261117_consultations_discharge_summary"
branch_labels = None
depends_on = None


json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def create_table_if_missing(name, *columns):
    if name not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table(name, *columns)


def create_index_if_missing(name, table, columns):
    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table)}
    if name not in indexes:
        op.create_index(name, table, columns)


def upgrade():
    create_table_if_missing(
        "workflow_templates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("facility_id", sa.String(36), sa.ForeignKey("facilities.id"), nullable=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("has_optional_lab_flow", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("steps_json", json_type, nullable=False),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    create_index_if_missing("ix_workflow_templates_facility_id", "workflow_templates", ["facility_id"])

    create_table_if_missing(
        "clinical_tasks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("facility_id", sa.String(36), sa.ForeignKey("facilities.id"), nullable=False),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=True),
        sa.Column("workflow_instance_id", sa.String(36), nullable=True),
        sa.Column("template_id", sa.String(36), sa.ForeignKey("workflow_templates.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category", sa.String(150), nullable=False, server_default="General"),
        sa.Column("step_order", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("short_label", sa.String(80), nullable=False, server_default=""),
        sa.Column("title", sa.String(250), nullable=False),
        sa.Column("sub_type", sa.String(80), nullable=False, server_default=""),
        sa.Column("priority", sa.String(20), nullable=False, server_default="Medium"),
        sa.Column("status", sa.String(20), nullable=False, server_default="Pending"),
        sa.Column("created_by_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assigned_to_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("comments", sa.Text(), nullable=False, server_default=""),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.CheckConstraint("priority IN ('High','Medium','Low')", name="ck_clinical_tasks_priority"),
        sa.CheckConstraint("status IN ('Pending','In-Progress','Completed')", name="ck_clinical_tasks_status"),
    )
    create_index_if_missing("ix_clinical_tasks_facility_id", "clinical_tasks", ["facility_id"])
    create_index_if_missing("ix_clinical_tasks_patient_id", "clinical_tasks", ["patient_id"])
    create_index_if_missing("ix_clinical_tasks_workflow_instance_id", "clinical_tasks", ["workflow_instance_id"])
    create_index_if_missing("ix_clinical_tasks_assigned_to_user_id", "clinical_tasks", ["assigned_to_user_id"])
    create_index_if_missing("ix_clinical_tasks_created_by_user_id", "clinical_tasks", ["created_by_user_id"])
    create_index_if_missing("ix_clinical_tasks_due_date", "clinical_tasks", ["due_date"])

    create_table_if_missing(
        "clinical_task_comments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("task_id", sa.String(36), sa.ForeignKey("clinical_tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    create_index_if_missing("ix_clinical_task_comments_task_id", "clinical_task_comments", ["task_id"])

    create_table_if_missing(
        "task_notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("facility_id", sa.String(36), sa.ForeignKey("facilities.id"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("task_id", sa.String(36), sa.ForeignKey("clinical_tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(40), nullable=False, server_default="assigned"),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    create_index_if_missing("ix_task_notifications_facility_id", "task_notifications", ["facility_id"])
    create_index_if_missing("ix_task_notifications_user_id", "task_notifications", ["user_id"])
    create_index_if_missing("ix_task_notifications_task_id", "task_notifications", ["task_id"])
    create_index_if_missing("ix_task_notifications_is_read", "task_notifications", ["is_read"])


def downgrade():
    op.drop_table("task_notifications")
    op.drop_table("clinical_task_comments")
    op.drop_table("clinical_tasks")
    op.drop_table("workflow_templates")
