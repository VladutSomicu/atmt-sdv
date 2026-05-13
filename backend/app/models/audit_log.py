from ..extensions import db
from datetime import datetime, timezone
import uuid


class AuditLog(db.Model):
    """
    Records every significant action performed in the system.
    Required by ISO 21434 for traceability and accountability.
    """
    __tablename__ = 'audit_log'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey('projects.id', ondelete='CASCADE'),
        nullable=True
    )
    threat_id = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey('threats.id', ondelete='SET NULL'),
        nullable=True
    )
    user_id = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey('users.id'),
        nullable=False
    )
    # Action type
    action = db.Column(db.String(100), nullable=False)
    # Snapshot of old and new values
    old_value = db.Column(db.JSON, nullable=True)
    new_value = db.Column(db.JSON, nullable=True)
    # Optional justification
    justification = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def __repr__(self):
        return f'<AuditLog {self.action} by {self.user_id}>'