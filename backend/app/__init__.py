from flask import Flask
from .config import Config
from .extensions import db, migrate, jwt, cors

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app)

    # Crucial: Import models here so Alembic can see them
    from . import models

    return app