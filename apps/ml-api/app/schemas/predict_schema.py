"""
Pydantic request/response schemas for ML API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class PredictRequest(BaseModel):
    """Input schema for adherence risk prediction."""
    userId: str
    age: int = Field(default=30, ge=1, le=120)
    missed_doses_last_7d: int = Field(default=0, ge=0, le=14)
    frequency: int = Field(default=1, ge=1, le=10, description="Doses per day")
    has_chronic_condition: bool = False
    adherence_streak: int = Field(default=0, ge=0)
    hour_of_day: int = Field(default=8, ge=0, le=23)
    is_weekend: bool = False
    num_medications: int = Field(default=1, ge=1)
    days_since_start: int = Field(default=30, ge=0)
    stock_days_remaining: int = Field(default=30, ge=0)
    medicationId: Optional[str] = None


class PredictResponse(BaseModel):
    """Output schema for adherence risk prediction."""
    missRisk: float
    riskLevel: str
    riskFactors: List[str]
    recommendation: str
    confidence: float
    modelVersion: str
    usedTrainedModel: bool


class DoseLogRequest(BaseModel):
    """Input schema for logging a dose event."""
    userId: str
    medicationId: str
    status: str
    scheduledTime: str
    hour: int = Field(ge=0, le=23)
    dayOfWeek: int = Field(ge=0, le=6)


class DoseLogResponse(BaseModel):
    """Output schema for dose logging."""
    status: str
    message: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    modelsReady: bool
    modelVersion: Optional[str] = None
