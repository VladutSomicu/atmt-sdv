from ..extensions import db
from ..models.audit_log import AuditLog


def log_action(user_id, action, project_id=None, threat_id=None,
               old_value=None, new_value=None, justification=None):
    """
    Record an action in the audit log.
    Call this after any significant change.
    """
    entry = AuditLog(
        user_id=str(user_id),
        project_id=str(project_id) if project_id else None,
        threat_id=str(threat_id) if threat_id else None,
        action=action,
        old_value=old_value,
        new_value=new_value,
        justification=justification
    )
    db.session.add(entry)
    # Note: caller must call db.session.commit()