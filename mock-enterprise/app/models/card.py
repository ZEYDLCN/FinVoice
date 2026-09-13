from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class CardStatus(str, Enum):
    ACTIVE = "ACTIVE"
    FROZEN = "FROZEN"
    CANCELLED = "CANCELLED"
    PENDING = "PENDING"


class CardType(str, Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"


class Card(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    card_id: str = Field(alias="cardId")
    customer_id: str = Field(alias="customerId")
    last4: str
    type: CardType
    status: CardStatus


class FreezeCardResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    card_id: str = Field(alias="cardId")
    status: CardStatus


class NewCardRequestResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    new_card_id: str = Field(alias="newCardId")
    replaces_card_id: str = Field(alias="replacesCardId")
    status: CardStatus
    estimated_delivery_days: int = Field(alias="estimatedDeliveryDays")
