from ..extensions import db
from datetime import datetime, timezone
import uuid


class Project(db.Model):
    """
    Represents a vehicle project for TARA (Threat Analysis and Risk Assessment).
    Each project is owned by a User.
    """
    __tablename__ = 'projects'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    vehicle_type = db.Column(db.String(100), nullable=True)

    # ASIL level as per ISO 26262 (e.g., QM, ASIL A, B, C, D)
    asil_level = db.Column(db.String(10), default='QM')

    # Relationships & Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Foreign Key linking to the User model
    user_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    owner = db.relationship('User', backref=db.backref('projects', lazy=True))

    def __repr__(self):
        return f'<Project {self.name}>'