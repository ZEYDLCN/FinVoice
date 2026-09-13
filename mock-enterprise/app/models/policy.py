from datetime import date
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class PolicyStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class Policy(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    policy_number: str = Field(alias="policyNumber")
    customer_id: str = Field(alias="customerId")
    customer_name: str = Field(alias="customer")
    status: PolicyStatus
    vehicle: str
    coverage: str
    covered_items: list[str] = Field(alias="coveredItems")
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")


class CoverageCheckResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    policy_number: str = Field(alias="policyNumber")
    topic: str
    covered: bool
    detail: str
