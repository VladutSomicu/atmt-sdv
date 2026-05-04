from flask import Flask
from .config import Config
from .extensions import db, migrate, jwt, cors, bcrypt


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app)
    bcrypt.init_app(app)

    # JWT blacklist callback - checks if token has been revoked
    from .models.revoked_token import RevokedToken

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload['jti']
        token = RevokedToken.query.filter_by(jti=jti).first()
        return token is not None

    # Import models so Alembic can detect them
    from . import models

    # Register blueprints
    from .routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    # Register CLI commands
    @app.cli.command("seed")
    def seed_command():
        """Populate the database with reference data."""
        from .utils.seed import run_all_seeds
        run_all_seeds()

    return app