from ..extensions import db
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import JSONB
import uuid


class Project(db.Model):
    """
    Represents a vehicle project for TARA (Threat Analysis and Risk Assessment).
    A project can have multiple members with different roles (see ProjectMember).
    """
    __tablename__ = 'projects'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # Vehicle profile stored as JSONB for flexibility
    # Example: {"propulsion": "EV", "architecture": "SDV", "sae_level": 3, ...}
    vehicle_profile = db.Column(JSONB, nullable=True)

    # Business objectives defined at TARA Item Definition stage
    business_objectives = db.Column(db.ARRAY(db.Text), nullable=True)

    # Project lifecycle status
    status = db.Column(db.String(20), default='draft', nullable=False)

    # Collaborative locking: only one user can edit the diagram at a time
    is_locked = db.Column(db.Boolean, default=False, nullable=False)
    locked_by = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=True)
    locked_at = db.Column(db.DateTime, nullable=True)

    # Audit fields
    created_by = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def __repr__(self):
        return f'<Project {self.name}>'