from fastapi import APIRouter, Query, status

from app.data.store import store
from app.models.claim import (
    Claim,
    ClaimCreateRequest,
    ClaimStatusUpdateRequest,
)

router = APIRouter(prefix="/claims", tags=["claims"])


@router.post("", response_model=Claim, status_code=status.HTTP_201_CREATED)
def create_claim(payload: ClaimCreateRequest):
    return store.create_claim(
        policy_number=payload.policy_number,
        accident_date=payload.accident_date,
        location=payload.location,
        description=payload.description,
    )


@router.get("", response_model=list[Claim])
def list_claims(policy_number: str | None = Query(default=None, alias="policyNumber")):
    return store.list_claims(policy_number)


@router.get("/{claim_id}", response_model=Claim)
def get_claim(claim_id: str):
    return store.get_claim(claim_id)


@router.patch("/{claim_id}", response_model=Claim)
def update_claim_status(claim_id: str, payload: ClaimStatusUpdateRequest):
    """Demo/ops helper to move a claim through its lifecycle.

    In production this transition would be driven by the claims-management
    system (e.g. an expert completing their review), not by the caller.
    """
    return store.update_claim_status(claim_id, payload.status)
