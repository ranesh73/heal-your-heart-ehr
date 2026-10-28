"""Database safeguards for finalized notes and append-only clinical/financial history."""
from alembic import op

revision='20261026_immutable'
down_revision='1c85441b9492'
branch_labels=None
depends_on=None
APPEND_ONLY=['audit_events','note_revisions','amendments','payments','credits','stock_movements']


def upgrade():
    if op.get_bind().dialect.name=='sqlite':
        for table in APPEND_ONLY:
            for action in ('UPDATE','DELETE'):
                op.execute(f"CREATE TRIGGER protect_{table}_{action.lower()} BEFORE {action} ON {table} BEGIN SELECT RAISE(ABORT, 'Immutable history record'); END")
        for action in ('UPDATE','DELETE'):
            op.execute(f"CREATE TRIGGER protect_signed_{action.lower()} BEFORE {action} ON encounters WHEN OLD.status = 'signed' BEGIN SELECT RAISE(ABORT, 'Signed encounter is immutable'); END")
    else:
        op.execute("""CREATE FUNCTION ehr_reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'Immutable history record'; END; $$""")
        for table in APPEND_ONLY:
            op.execute(f"CREATE TRIGGER protect_{table} BEFORE UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION ehr_reject_history_mutation()")
        op.execute("""CREATE FUNCTION ehr_reject_signed_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF OLD.status = 'signed' THEN RAISE EXCEPTION 'Signed encounter is immutable'; END IF;
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END; $$""")
        op.execute('CREATE TRIGGER protect_signed BEFORE UPDATE OR DELETE ON encounters FOR EACH ROW EXECUTE FUNCTION ehr_reject_signed_mutation()')


def downgrade():
    if op.get_bind().dialect.name=='sqlite':
        for table in APPEND_ONLY:
            for action in ('update','delete'): op.execute(f'DROP TRIGGER protect_{table}_{action}')
        for action in ('update','delete'): op.execute(f'DROP TRIGGER protect_signed_{action}')
    else:
        for table in APPEND_ONLY: op.execute(f'DROP TRIGGER protect_{table} ON {table}')
        op.execute('DROP TRIGGER protect_signed ON encounters')
        op.execute('DROP FUNCTION ehr_reject_signed_mutation()')
        op.execute('DROP FUNCTION ehr_reject_history_mutation()')
