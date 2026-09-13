from .card_tools import freeze_card, get_cards, request_new_card
from .claims_tools import create_claim, get_claim_status
from .customer_tools import get_customer
from .handoff_tools import transfer_to_human
from .policy_tools import check_policy_coverage, get_policy
from .support_tools import create_support_ticket

ALL_TOOLS = [
    get_customer,
    get_policy,
    check_policy_coverage,
    create_claim,
    get_claim_status,
    get_cards,
    freeze_card,
    request_new_card,
    create_support_ticket,
    transfer_to_human,
]

TOOLS_BY_NAME = {t.name: t for t in ALL_TOOLS}
