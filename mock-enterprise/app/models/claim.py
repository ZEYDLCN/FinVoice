from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ClaimStatus(str, Enum):
    OPEN = "OPEN"
    EXPERT_REVIEW = "EXPERT_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CLOSED = "CLOSED"


class ClaimCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    policy_number: str = Field(alias="policyNumber")
    accident_date: date = Field(alias="accidentDate")
    location: str
    description: str


class ClaimStatusUpdateRequest(BaseModel):
    status: ClaimStatus


class Claim(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    claim_id: str = Field(alias="claimId")
    policy_number: str = Field(alias="policyNumber")
    status: ClaimStatus
    accident_date: date = Field(alias="accidentDate")
    location: str
    description: str
    created_at: datetime = Field(alias="createdAt")
