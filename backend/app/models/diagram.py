from ..extensions import db
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timezone
import uuid


class Diagram(db.Model):
    """
    Stores a versioned snapshot of the JointJS canvas (graph_json).
    Each save creates a new version, preserving history.
    """
    __tablename__ = 'diagrams'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey('projects.id', ondelete='CASCADE'),
        nullable=False
    )

    # The complete canvas state from JointJS
    graph_json = db.Column(JSONB, nullable=False)

    # DFD level: 0 = context, 1 = system, 2 = component
    dfd_level = db.Column(db.SmallInteger, default=1, nullable=False)

    # Version number, incremented on each save
    version = db.Column(db.Integer, default=1, nullable=False)

    # Who saved this version
    saved_by = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey('users.id'),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def __repr__(self):
        return f'<Diagram project={self.project_id} v{self.version}>'