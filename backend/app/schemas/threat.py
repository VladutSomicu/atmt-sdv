from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class UpdateThreatSchema(BaseModel):
    """Validation schema for updating a threat's scores and treatment."""
    model_config = ConfigDict(str_strip_whitespace=True)

    # Impact scores (SFOP) - scale 1-4
    impact_safety: Optional[int] = Field(None, ge=1, le=4)
    impact_financial: Optional[int] = Field(None, ge=1, le=4)
    impact_operational: Optional[int] = Field(None, ge=1, le=4)
    impact_privacy: Optional[int] = Field(None, ge=1, le=4)

    # Feasibility - scale 1-5
    feasibility: Optional[int] = Field(None, ge=1, le=5)

    # Treatment
    status: Optional[str] = Field(None, pattern=r'^(open|mitigated|accepted|transferred|avoided)$')
    treatment: Optional[str] = Field(None, pattern=r'^(mitigate|accept|transfer|avoid)$')
    justification: Optional[str] = None

    # Controls applied
    control_ids: Optional[list[str]] = None