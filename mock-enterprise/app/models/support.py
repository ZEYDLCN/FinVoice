from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class TicketStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class SupportTicketCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    customer_id: str = Field(alias="customerId")
    subject: str
    description: str


class SupportTicket(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    ticket_id: str = Field(alias="ticketId")
    customer_id: str = Field(alias="customerId")
    subject: str
    description: str
    status: TicketStatus
    created_at: datetime = Field(alias="createdAt")
