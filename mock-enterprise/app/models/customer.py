from pydantic import BaseModel, ConfigDict, Field


class Customer(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    customer_id: str = Field(alias="customerId")
    name: str
    email: str
    phone: str
    national_id: str = Field(alias="nationalId")
