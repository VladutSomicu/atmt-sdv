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

    # Import models so Alembic can detect them
    from . import models

    # Register blueprints
    from .routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    return app