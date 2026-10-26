from sqlalchemy import Column, Integer, String, Float, Numeric, DateTime, ForeignKey, Index, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.base import Base
import enum

class SettlementStatus(enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    DISPUTED = "DISPUTED"

class Expense(Base):
    __tablename__ = "expenses"
    expense_id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.group_id"), nullable=False, index=True)
    payer_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    description = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(50))
    date = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="expenses")
    payer = relationship("User", back_populates="paid_expenses")
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")

class ExpenseSplit(Base):
    __tablename__ = "expense_splits"
    split_id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.expense_id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    amount_owed = Column(Float, nullable=False)

    expense = relationship("Expense", back_populates="splits")
    user = relationship("User", back_populates="owed_splits")

class Settlement(Base):
    __tablename__ = "settlements"
    settlement_id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.group_id"), nullable=False)
    payer_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(SettlementStatus), default=SettlementStatus.PENDING, nullable=False)
    note = Column(String(255))
    dispute_reason = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)
    disputed_at = Column(DateTime, nullable=True)

    group = relationship("Group")
    payer = relationship("User", foreign_keys=[payer_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

class SettlementAudit(Base):
    __tablename__ = "settlement_audits"
    audit_id = Column(Integer, primary_key=True, index=True)
    settlement_id = Column(Integer, ForeignKey("settlements.settlement_id"), nullable=False)
    old_status = Column(Enum(SettlementStatus))
    new_status = Column(Enum(SettlementStatus), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow)
    action_details = Column(String(255))

# Indexes for performance
Index("idx_expense_group_date", Expense.group_id, Expense.date)
Index("idx_split_expense_user", ExpenseSplit.expense_id, ExpenseSplit.user_id)
Index("idx_settlement_group_status", Settlement.group_id, Settlement.status)
