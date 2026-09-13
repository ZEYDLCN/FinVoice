"""In-memory data store for the mock-enterprise demo services.

This is intentionally NOT a database. FinVoice Ops Phase 1 only needs a
predictable, resettable data layer that stands in for real core-banking /
policy-administration / claims-management systems so the future Voice Agent
(Phase 4) has real APIs to call against. See ROADMAP.md for when a real
database (PostgreSQL) is introduced.
"""
import itertools
import threading
from datetime import date, datetime, timezone

from app.core.exceptions import ConflictError, NotFoundError
from app.models.card import Card, CardStatus, CardType
from app.models.claim import Claim, ClaimStatus
from app.models.customer import Customer
from app.models.policy import Policy, PolicyStatus
from app.models.support import SupportTicket, TicketStatus

_lock = threading.Lock()


def _now() -> datetime:
    return datetime.now(timezone.utc)


class InMemoryStore:
    def __init__(self) -> None:
        self._claim_seq = itertools.count(98221)
        self._ticket_seq = itertools.count(1001)
        self._card_seq = itertools.count(9003)
        self.customers: dict[str, Customer] = {}
        self.policies: dict[str, Policy] = {}
        self.claims: dict[str, Claim] = {}
        self.cards: dict[str, Card] = {}
        self.tickets: dict[str, SupportTicket] = {}
        self._seed()

    # ------------------------------------------------------------------ #
    # Seed data — mirrors the examples used throughout the FinVoice Ops
    # specification (README.md) so demo scripts and docs stay consistent.
    # ------------------------------------------------------------------ #
    def _seed(self) -> None:
        zeyd = Customer(
            customerId="CUST-001",
            name="Zeyd Alcan",
            email="zeyd.alcan@example.com",
            phone="+90 532 000 00 01",
            nationalId="11111111110",
        )
        ayse = Customer(
            customerId="CUST-002",
            name="Ayşe Yılmaz",
            email="ayse.yilmaz@example.com",
            phone="+90 532 000 00 02",
            nationalId="22222222220",
        )
        for c in (zeyd, ayse):
            self.customers[c.customer_id] = c

        self.policies["TR-92831"] = Policy(
            policyNumber="TR-92831",
            customerId=zeyd.customer_id,
            customer=zeyd.name,
            status=PolicyStatus.ACTIVE,
            vehicle="Seat Leon",
            coverage="FULL_CASCO",
            coveredItems=["collision", "theft", "fire", "towing", "glass"],
            startDate=date(2026, 1, 1),
            endDate=date(2026, 12, 31),
        )
        self.policies["TR-10442"] = Policy(
            policyNumber="TR-10442",
            customerId=ayse.customer_id,
            customer=ayse.name,
            status=PolicyStatus.EXPIRED,
            vehicle="Renault Clio",
            coverage="THIRD_PARTY",
            coveredItems=["third_party_liability"],
            startDate=date(2025, 1, 1),
            endDate=date(2025, 12, 31),
        )

        self.cards["CARD-9001"] = Card(
            cardId="CARD-9001",
            customerId=zeyd.customer_id,
            last4="4821",
            type=CardType.DEBIT,
            status=CardStatus.ACTIVE,
        )
        self.cards["CARD-9002"] = Card(
            cardId="CARD-9002",
            customerId=ayse.customer_id,
            last4="7743",
            type=CardType.CREDIT,
            status=CardStatus.ACTIVE,
        )

    # ------------------------------------------------------------------ #
    # Customers
    # ------------------------------------------------------------------ #
    def get_customer(self, customer_id: str) -> Customer:
        customer = self.customers.get(customer_id)
        if not customer:
            raise NotFoundError(f"Customer '{customer_id}' not found")
        return customer

    def search_customers(self, query: str | None) -> list[Customer]:
        if not query:
            return list(self.customers.values())
        q = query.lower()
        return [
            c
            for c in self.customers.values()
            if q in c.name.lower() or q in c.email.lower()
        ]

    # ------------------------------------------------------------------ #
    # Policies
    # ------------------------------------------------------------------ #
    def get_policy(self, policy_number: str) -> Policy:
        policy = self.policies.get(policy_number)
        if not policy:
            raise NotFoundError(f"Policy '{policy_number}' not found")
        return policy

    def list_policies(self, customer_id: str | None) -> list[Policy]:
        values = list(self.policies.values())
        if customer_id:
            values = [p for p in values if p.customer_id == customer_id]
        return values

    # ------------------------------------------------------------------ #
    # Claims
    # ------------------------------------------------------------------ #
    def create_claim(
        self, policy_number: str, accident_date: date, location: str, description: str
    ) -> Claim:
        policy = self.get_policy(policy_number)
        if policy.status != PolicyStatus.ACTIVE:
            raise ConflictError(
                f"Policy '{policy_number}' is {policy.status.value}, cannot open a claim"
            )
        with _lock:
            claim_id = f"CLM-{next(self._claim_seq)}"
            claim = Claim(
                claimId=claim_id,
                policyNumber=policy_number,
                status=ClaimStatus.OPEN,
                accidentDate=accident_date,
                location=location,
                description=description,
                createdAt=_now(),
            )
            self.claims[claim_id] = claim
        return claim

    def get_claim(self, claim_id: str) -> Claim:
        claim = self.claims.get(claim_id)
        if not claim:
            raise NotFoundError(f"Claim '{claim_id}' not found")
        return claim

    def list_claims(self, policy_number: str | None) -> list[Claim]:
        values = list(self.claims.values())
        if policy_number:
            values = [c for c in values if c.policy_number == policy_number]
        return values

    def update_claim_status(self, claim_id: str, status: ClaimStatus) -> Claim:
        claim = self.get_claim(claim_id)
        updated = claim.model_copy(update={"status": status})
        self.claims[claim_id] = updated
        return updated

    # ------------------------------------------------------------------ #
    # Cards
    # ------------------------------------------------------------------ #
    def get_card(self, card_id: str) -> Card:
        card = self.cards.get(card_id)
        if not card:
            raise NotFoundError(f"Card '{card_id}' not found")
        return card

    def list_cards(self, customer_id: str) -> list[Card]:
        return [c for c in self.cards.values() if c.customer_id == customer_id]

    def freeze_card(self, card_id: str) -> Card:
        card = self.get_card(card_id)
        if card.status == CardStatus.CANCELLED:
            raise ConflictError(f"Card '{card_id}' is already cancelled")
        updated = card.model_copy(update={"status": CardStatus.FROZEN})
        self.cards[card_id] = updated
        return updated

    def request_new_card(self, card_id: str) -> Card:
        old_card = self.get_card(card_id)
        with _lock:
            new_card_id = f"CARD-{next(self._card_seq)}"
            new_card = Card(
                cardId=new_card_id,
                customerId=old_card.customer_id,
                last4=old_card.last4,
                type=old_card.type,
                status=CardStatus.PENDING,
            )
            self.cards[new_card_id] = new_card
            self.cards[card_id] = old_card.model_copy(
                update={"status": CardStatus.CANCELLED}
            )
        return new_card

    # ------------------------------------------------------------------ #
    # Support tickets
    # ------------------------------------------------------------------ #
    def create_ticket(
        self, customer_id: str, subject: str, description: str
    ) -> SupportTicket:
        self.get_customer(customer_id)  # validates existence
        with _lock:
            ticket_id = f"TCK-{next(self._ticket_seq)}"
            ticket = SupportTicket(
                ticketId=ticket_id,
                customerId=customer_id,
                subject=subject,
                description=description,
                status=TicketStatus.OPEN,
                createdAt=_now(),
            )
            self.tickets[ticket_id] = ticket
        return ticket

    def get_ticket(self, ticket_id: str) -> SupportTicket:
        ticket = self.tickets.get(ticket_id)
        if not ticket:
            raise NotFoundError(f"Support ticket '{ticket_id}' not found")
        return ticket


store = InMemoryStore()
