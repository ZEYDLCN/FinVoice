import pytest
import respx
from httpx import Response

MOCK_BASE = "http://localhost:8000"

# Canned mock-enterprise responses, mirroring the seed data in
# mock-enterprise/app/data/store.py so scenarios read the same in every layer.
POLICY_ACTIVE = {
    "policyNumber": "TR-92831",
    "customerId": "CUST-001",
    "customer": "Zeyd Alcan",
    "status": "ACTIVE",
    "vehicle": "Seat Leon",
    "coverage": "FULL_CASCO",
    "coveredItems": ["collision", "theft", "fire", "towing", "glass"],
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
}

POLICY_EXPIRED = {**POLICY_ACTIVE, "policyNumber": "TR-10442", "status": "EXPIRED"}

CLAIM_CREATED = {
    "claimId": "CLM-98221",
    "policyNumber": "TR-92831",
    "status": "OPEN",
    "accidentDate": "2026-09-10",
    "location": "Istanbul",
    "description": "Rear collision",
    "createdAt": "2026-09-13T21:19:14Z",
}


@pytest.fixture
def mock_enterprise():
    with respx.mock(base_url=MOCK_BASE, assert_all_called=False) as router:
        router.get("/api/policies/TR-92831").mock(return_value=Response(200, json=POLICY_ACTIVE))
        router.get("/api/policies/TR-10442").mock(return_value=Response(200, json=POLICY_EXPIRED))
        router.get("/api/policies/UNKNOWN").mock(
            return_value=Response(404, json={"detail": "Policy 'UNKNOWN' not found"})
        )
        router.post("/api/claims").mock(return_value=Response(201, json=CLAIM_CREATED))
        yield router


RAG_BASE = "http://localhost:8300"

RAG_SEARCH_RESULTS = [
    {
        "text": (
            "2. İkame Araç Hizmeti Onarım süresi 7 günü aşan hasar "
            "dosyalarında sigortalıya ikame araç sağlanır; en fazla 15 gün."
        ),
        "source": "kasko_sartlari.pdf",
        "score": 0.42,
    }
]


@pytest.fixture
def mock_rag():
    with respx.mock(base_url=RAG_BASE, assert_all_called=False) as router:
        router.post("/v1/search").mock(
            return_value=Response(200, json={"results": RAG_SEARCH_RESULTS})
        )
        yield router
