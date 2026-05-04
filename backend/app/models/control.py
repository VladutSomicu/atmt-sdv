from ..extensions import db
import uuid


class Control(db.Model):
    """
    Library of security controls (mitigations) that can be applied to threats.
    Each control reduces the feasibility score of a threat.
    """
    __tablename__ = 'controls_library'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, nullable=True)
    # STRIDE categories this control addresses
    applies_to_stride = db.Column(db.ARRAY(db.Text), nullable=True)
    # Protocols this control is relevant for
    applies_to_protocols = db.Column(db.ARRAY(db.Text), nullable=True)
    # How much this control reduces the Feasibility score (0-4)
    feasibility_reduction = db.Column(db.SmallInteger, nullable=True)
    # Reference: ISO_21434_AnnexC, NIST_SP800-53_SC-8, etc.
    source_ref = db.Column(db.String(200), nullable=True)

    def __repr__(self):
        return f'<Control {self.title}>'