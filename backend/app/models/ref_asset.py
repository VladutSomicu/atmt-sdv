from ..extensions import db
from sqlalchemy.dialects.postgresql import JSONB
import uuid


class RefAsset(db.Model):
    """
    Reference library of automotive components (assets).
    These are the building blocks available in the canvas sidebar.
    """
    __tablename__ = 'ref_assets'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    # e.g. ["CAN", "CAN-FD", "Ethernet"]
    interface_types = db.Column(db.ARRAY(db.Text), nullable=True)
    # e.g. ["Control Commands", "PII", "Sensor Data"]
    data_types = db.Column(db.ARRAY(db.Text), nullable=True)
    # Internal / External-Facing / OBD-II
    physical_accessibility = db.Column(db.String(30), nullable=True)
    # ISO 26262 ASIL level: A, B, C, D
    asil_level = db.Column(db.String(1), nullable=True)
    # Default impact scores pre-filled by the analysis engine
    default_safety = db.Column(db.SmallInteger, nullable=True)
    default_financial = db.Column(db.SmallInteger, nullable=True)
    default_operational = db.Column(db.SmallInteger, nullable=True)
    default_privacy = db.Column(db.SmallInteger, nullable=True)
    # Special flags: is_connected_to_cloud, is_virtualized, ota_capable, etc.
    flags = db.Column(db.ARRAY(db.Text), nullable=True)
    # ICE / EV / Hybrid / SDV -- filters what appears in sidebar per vehicle profile
    vehicle_types = db.Column(db.ARRAY(db.Text), nullable=True)

    def __repr__(self):
        return f'<RefAsset {self.name}>'