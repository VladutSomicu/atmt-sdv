import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Flask session security (cookies, CSRF)
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-default')

    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT authentication
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-dev-key-default')