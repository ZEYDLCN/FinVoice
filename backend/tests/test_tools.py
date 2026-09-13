import pytest

from backend.tools.claims_tools import create_claim
from backend.tools.policy_tools import get_policy
from backend.tools.mock_client import MockEnterpriseError


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
