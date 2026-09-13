import pytest

from backend.tools.claims_tools import create_claim
from backend.tools.policy_tools import get_policy
from backend.tools.mock_client import MockEnterpriseError
from backend.tools.rag_tools import search_policy_documents


async def test_get_policy_active(mock_enterprise):
    result = await get_policy.ainvoke({"policy_number": "TR-92831"})
    assert result["status"] == "ACTIVE"
    assert result["vehicle"] == "Seat Leon"


async def test_get_policy_not_found_raises(mock_enterprise):
    with pytest.raises(MockEnterpriseError):
        await get_policy.ainvoke({"policy_number": "UNKNOWN"})


async def test_create_claim(mock_enterprise):
    result = await create_claim.ainvoke(
        {
            "policy_number": "TR-92831",
            "accident_date": "2026-09-10",
            "location": "Istanbul",
            "description": "Rear collision",
        }
    )
    assert result["claimId"] == "CLM-98221"
    assert result["status"] == "OPEN"


async def test_search_policy_documents(mock_rag):
    results = await search_policy_documents.ainvoke(
        {"query": "İkame araç kaç gün sağlanır?"}
    )
    assert results
    assert results[0]["source"] == "kasko_sartlari.pdf"
