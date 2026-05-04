from ..extensions import db
import uuid


class RefThreat(db.Model):
    """
    Reference library of automotive threats (CAPEC, UNECE R155, OWASP, LINDDUN).
    Used by the analysis engine to identify threats on the diagram.
    """
    __tablename__ = 'ref_threats'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stride_category = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, nullable=True)
    # Source: UNECE_R155 / CAPEC / OWASP / LINDDUN
    source = db.Column(db.String(50), nullable=True)
    # Exact reference: CAPEC-167, UNECE_R155_A5_T07, etc.
    source_ref = db.Column(db.String(100), nullable=True)
    # Protocols that trigger this threat: e.g. ["CAN", "CAN-FD"]
    trigger_protocols = db.Column(db.ARRAY(db.Text), nullable=True)
    # Asset categories that trigger this threat
    trigger_categories = db.Column(db.ARRAY(db.Text), nullable=True)
    # Special flags that trigger this threat: is_connected_to_cloud, etc.
    trigger_flags = db.Column(db.ARRAY(db.Text), nullable=True)
    # Default scores suggested by the engine
    default_impact = db.Column(db.SmallInteger, nullable=True)
    default_feasibility = db.Column(db.SmallInteger, nullable=True)

    def __repr__(self):
        return f'<RefThreat {self.title}>'