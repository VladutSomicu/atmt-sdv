from ..extensions import db
from datetime import datetime, timezone
import uuid


class ProjectMember(db.Model):
    """
    Junction table linking users to projects with a specific role.
    A user can be a member of multiple projects with different roles
    (e.g., engineer on Project A, auditor on Project B).
    """
    __tablename__ = 'project_members'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey('projects.id', ondelete='CASCADE'),
        nullable=False
    )
    user_id = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )

    # Role on this specific project: engineer / architect / manager / auditor
    role = db.Column(db.String(20), nullable=False)

    # Who invited this member
    invited_by = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=True)

    joined_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # A user can only have one role per project (no duplicates)
    __table_args__ = (
        db.UniqueConstraint('project_id', 'user_id', name='uq_project_user'),
    )

    def __repr__(self):
        return f'<ProjectMember user={self.user_id} project={self.project_id} role={self.role}>'