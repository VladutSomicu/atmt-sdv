from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class SaveDiagramSchema(BaseModel):
    """Validation schema for saving a diagram version."""
    model_config = ConfigDict(str_strip_whitespace=True)

    project_id: str = Field(min_length=36, max_length=36)
    graph_json: dict
    dfd_level: Optional[int] = 1