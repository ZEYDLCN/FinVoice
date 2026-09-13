"""Async HTTP client for mock-enterprise (Faz 1).

This is the Python counterpart of `frontend/src/lib/mockApi.ts` — same
endpoints, same idea (thin typed wrappers around the REST API), just called
from the agent's tool layer instead of the Next.js demo agent.
"""
from __future__ import annotations

import os

import httpx

MOCK_ENTERPRISE_URL = os.environ.get("MOCK_ENTERPRISE_URL", "http://localhost:8000")


class MockEnterpriseError(Exception):
    """Raised when mock-enterprise returns a non-2xx response. The message
    is the API's own `detail` field so the LLM can see *why* a call failed
    (e.g. "Policy 'TR-000' not found") and react sensibly."""


async def _request(method: str, path: str, **kwargs) -> dict:
    async with httpx.AsyncClient(base_url=MOCK_ENTERPRISE_URL, timeout=10.0) as client:
        resp = await client.request(method, path, **kwargs)
        if resp.status_code >= 400:
            try:
                detail = resp.json().get("detail", resp.text)
            except Exception:
                detail = resp.text
            raise MockEnterpriseError(detail)
        return resp.json()


async def get_customer(customer_id: str) -> dict:
    return await _request("GET", f"/api/customers/{customer_id}")


async def get_policy(policy_number: str) -> dict:
    return await _request("GET", f"/api/policies/{policy_number}")


async def check_coverage(policy_number: str, topic: str) -> dict:
    return await _request(
        "GET", f"/api/policies/{policy_number}/coverage", params={"topic": topic}
    )


async def create_claim(
    policy_number: str, accident_date: str, location: str, description: str
) -> dict:
    return await _request(
        "POST",
        "/api/claims",
        json={
            "policyNumber": policy_number,
            "accidentDate": accident_date,
            "location": location,
            "description": description,
        },
    )


async def get_claim_status(claim_id: str) -> dict:
    return await _request("GET", f"/api/claims/{claim_id}")


async def list_customer_cards(customer_id: str) -> list[dict]:
    return await _request("GET", f"/api/customers/{customer_id}/cards")


async def freeze_card(card_id: str) -> dict:
    return await _request("POST", f"/api/cards/{card_id}/freeze")


async def request_replacement_card(card_id: str) -> dict:
    return await _request("POST", f"/api/cards/{card_id}/request-replacement")


async def create_support_ticket(customer_id: str, subject: str, description: str) -> dict:
    return await _request(
        "POST",
        "/api/support/tickets",
        json={"customerId": customer_id, "subject": subject, "description": description},
    )
