import re
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator


def validate_password_strength(v: str) -> str:
    if len(v) < 12:
        raise ValueError('Password must be at least 12 characters')
    if not re.search(r'[A-Z]', v):
        raise ValueError('Password must contain at least one uppercase letter')
    if not re.search(r'[a-z]', v):
        raise ValueError('Password must contain at least one lowercase letter')
    if not re.search(r'\d', v):
        raise ValueError('Password must contain at least one digit')
    if not re.search(r'[^A-Za-z0-9\s]', v):
        raise ValueError('Password must contain at least one special character')
    return v


class RegisterSchema(BaseModel):
    """Validation schema for user registration requests."""
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    full_name: str = Field(min_length=2, max_length=200)

    @field_validator('password')
    @classmethod
    def validate_pwd(cls, v: str) -> str:
        return validate_password_strength(v)


class LoginSchema(BaseModel):
    """Validation schema for user login requests."""
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)