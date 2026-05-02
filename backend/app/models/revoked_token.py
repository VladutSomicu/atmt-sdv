from ..extensions import db
from datetime import datetime, timezone
import uuid


class RevokedToken(db.Model):
    """
    Stores JWT identifiers (jti) of tokens that have been revoked.
    A token is considered invalid if its jti exists in this table.
    """
    __tablename__ = 'revoked_tokens'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jti = db.Column(db.String(36), unique=True, nullable=False, index=True)
    token_type = db.Column(db.String(10), nullable=False)
    user_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    revoked_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def __repr__(self):
        return f'<RevokedToken jti={self.jti}>'