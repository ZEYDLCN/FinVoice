from fastapi import APIRouter, Query

from app.data.store import store
from app.models.customer import Customer

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[Customer])
def search_customers(q: str | None = Query(default=None, description="Name or email search")):
    return store.search_customers(q)


@router.get("/{customer_id}", response_model=Customer)
def get_customer(customer_id: str):
    return store.get_customer(customer_id)
