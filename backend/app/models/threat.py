from ..extensions import db
from datetime import datetime, timezone
import uuid


class Threat(db.Model):
    """
    A threat identified by the analysis engine on a specific node/edge.
    Stores both baseline scores (from engine) and expert-adjusted scores.
    """
    __tablename__ = 'threats'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey('projects.id', ondelete='CASCADE'),
        nullable=False
    )
    ref_threat_id = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey('ref_threats.id'),
        nullable=True
    )

    # Which node/edge in graph_json is affected
    asset_id = db.Column(db.String(100), nullable=False)
    asset_name = db.Column(db.String(200), nullable=True)
    flow_id = db.Column(db.String(100), nullable=True)

    # Threat metadata (copied from ref_threats for convenience)
    stride_category = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, nullable=True)
    source = db.Column(db.String(50), nullable=True)
    source_ref = db.Column(db.String(100), nullable=True)

    # Impact scores (SFOP) - scale 1-4
    impact_safety = db.Column(db.SmallInteger, nullable=False)
    impact_financial = db.Column(db.SmallInteger, nullable=False)
    impact_operational = db.Column(db.SmallInteger, nullable=False)
    impact_privacy = db.Column(db.SmallInteger, nullable=False)

    # Feasibility score - scale 1-5
    feasibility = db.Column(db.SmallInteger, nullable=False)

    # Risk score = max(SFOP) * feasibility - calculated by application
    risk_score = db.Column(db.SmallInteger, nullable=False)

    # Treatment
    status = db.Column(db.String(20), default='open', nullable=False)
    treatment = db.Column(db.String(20), nullable=True)
    justification = db.Column(db.Text, nullable=True)
    control_ids = db.Column(db.ARRAY(db.UUID(as_uuid=True)), nullable=True)

    # Tracking
    is_baseline_modified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def __repr__(self):
        return f'<Threat {self.title} on {self.asset_id}>'
