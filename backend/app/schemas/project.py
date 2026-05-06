from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class CreateProjectSchema(BaseModel):
    """Validation schema for creating a new project."""
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=150)
    description: Optional[str] = None
    vehicle_profile: Optional[dict] = None
    business_objectives: Optional[list[str]] = None


class InviteMemberSchema(BaseModel):
    """Validation schema for inviting a user to a project."""
    model_config = ConfigDict(str_strip_whitespace=True)

    email: str = Field(min_length=3)
    role: str = Field(pattern=r'^(engineer|architect|manager|auditor)$')