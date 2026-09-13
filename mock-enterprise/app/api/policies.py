from fastapi import APIRouter, Query

from app.data.store import store
from app.models.policy import CoverageCheckResponse, Policy

router = APIRouter(prefix="/policies", tags=["policies"])

# Minimal Turkish/English synonym map so the future Voice Agent can ask
# coverage questions in natural language without needing full RAG (Phase 6)
# for simple, structured coverage lookups.
_TOPIC_SYNONYMS = {
    "cekici": "towing",
    "çekici": "towing",
    "towing": "towing",
    "hirsizlik": "theft",
    "hırsızlık": "theft",
    "theft": "theft",
    "yangin": "fire",
    "yangın": "fire",
    "fire": "fire",
    "cam": "glass",
    "glass": "glass",
    "carpisma": "collision",
    "çarpışma": "collision",
    "collision": "collision",
    "kaza": "collision",
}


@router.get("", response_model=list[Policy])
def list_policies(customer_id: str | None = Query(default=None, alias="customerId")):
    return store.list_policies(customer_id)


@router.get("/{policy_number}", response_model=Policy)
def get_policy(policy_number: str):
    return store.get_policy(policy_number)


@router.get("/{policy_number}/coverage", response_model=CoverageCheckResponse)
def check_coverage(policy_number: str, topic: str = Query(..., description="e.g. towing, theft, fire")):
    policy = store.get_policy(policy_number)
    normalized = _TOPIC_SYNONYMS.get(topic.strip().lower(), topic.strip().lower())
    covered = normalized in {item.lower() for item in policy.covered_items}
    if covered:
        detail = f"'{policy.coverage}' teminatınız '{normalized}' kapsamını içeriyor."
    else:
        detail = f"'{policy.coverage}' teminatınız '{normalized}' kapsamını içermiyor."
    return CoverageCheckResponse(
        policyNumber=policy_number, topic=normalized, covered=covered, detail=detail
    )
