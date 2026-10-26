from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from enum import Enum

class SettlementStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    DISPUTED = "DISPUTED"

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class GroupBase(BaseModel):
    group_name: str

class GroupCreate(GroupBase):
    pass

class GroupOut(GroupBase):
    group_id: int
    created_by: int
    created_at: datetime
    class Config:
        from_attributes = True

class GroupMemberOut(BaseModel):
    user_id: int
    role: str
    joined_at: datetime
    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    description: str
    amount: float
    category: Optional[str] = None
    group_id: int

class ExpenseCreate(ExpenseBase):
    payer_id: int
    splits: List[SplitCreate]

class SplitCreate(BaseModel):
    user_id: int
    amount: float

class ExpenseOut(ExpenseBase):
    expense_id: int
    payer_id: int
    date: datetime
    class Config:
        from_attributes = True

class BalanceOut(BaseModel):
    user_id: int
    username: str
    balance: float # positive means creditor, negative means debtor

class SettlementOut(BaseModel):
    settlement_id: int
    payer_id: int
    receiver_id: int
    amount: float
    status: SettlementStatus
    note: Optional[str] = None
    dispute_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class SettlementCreate(BaseModel):
    receiver_id: int
    group_id: int
    amount: float
    note: Optional[str] = None

class SettlementConfirm(BaseModel):
    pass

class SettlementDispute(BaseModel):
    reason: str

class SettlementCancel(BaseModel):
    pass
