from fastapi import APIRouter, status

from app.data.store import store
from app.models.support import SupportTicket, SupportTicketCreateRequest

router = APIRouter(prefix="/support/tickets", tags=["support"])


@router.post("", response_model=SupportTicket, status_code=status.HTTP_201_CREATED)
def create_ticket(payload: SupportTicketCreateRequest):
    return store.create_ticket(
        customer_id=payload.customer_id,
        subject=payload.subject,
        description=payload.description,
    )


@router.get("/{ticket_id}", response_model=SupportTicket)
def get_ticket(ticket_id: str):
    return store.get_ticket(ticket_id)
