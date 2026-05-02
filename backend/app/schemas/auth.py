from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RegisterSchema(BaseModel):
    """Validation schema for user registration requests."""
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=200)


class LoginSchema(BaseModel):
    """Validation schema for user login requests."""
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)