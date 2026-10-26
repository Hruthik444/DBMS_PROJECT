from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from ..db.session import get_db
from ..models.expense import Expense, ExpenseSplit, Settlement, SettlementStatus
from ..models.user import User
from ..models.group import GroupMember
from ..schemas.schemas import BalanceOut, SettlementOut
from ..core.auth import get_current_user

router = APIRouter(prefix="/balances", tags=["Balances"])

@router.get("/group/{group_id}", response_model=list[BalanceOut])
def get_group_balances(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.user_id).first()
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    group_members = db.query(User).join(GroupMember).filter(GroupMember.group_id == group_id).all()
    balances = []

    for user in group_members:
        # 1. Amount this user paid for others (Gross)
        paid = db.query(func.sum(Expense.amount)).filter(Expense.payer_id == user.user_id, Expense.group_id == group_id).scalar() or 0

        # 2. Amount this user owes others (Gross)
        owed = db.query(func.sum(ExpenseSplit.amount_owed)).filter(ExpenseSplit.user_id == user.user_id, ExpenseSplit.expense_id.in_(
            db.query(Expense.expense_id).filter(Expense.group_id == group_id)
        )).scalar() or 0

        # 3. Amount this user has successfully repaid to others
        repaid_out = db.query(func.sum(Settlement.amount)).filter(
            Settlement.payer_id == user.user_id,
            Settlement.group_id == group_id,
            Settlement.status == SettlementStatus.CONFIRMED
        ).scalar() or 0

        # 4. Amount others have successfully repaid to this user
        repaid_in = db.query(func.sum(Settlement.amount)).filter(
            Settlement.receiver_id == user.user_id,
            Settlement.group_id == group_id,
            Settlement.status == SettlementStatus.CONFIRMED
        ).scalar() or 0

        # Net Balance = (Gross Paid + Repayments In) - (Gross Owed + Repayments Out)
        # Simplified: (paid - owed) + (repaid_in - repaid_out)
        net_balance = (paid - owed) + (repaid_in - repaid_out)

        balances.append(BalanceOut(
            user_id=user.user_id,
            username=user.username,
            balance=float(net_balance)
        ))

    return balances

@router.get("/group/{group_id}/settle", response_model=list[SettlementOut])
def calculate_settlements(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.user_id).first()
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    # 1. Get current balances (using the updated logic)
    group_members = db.query(User).join(GroupMember).filter(GroupMember.group_id == group_id).all()
    net_balances = []
    for user in group_members:
        paid = db.query(func.sum(Expense.amount)).filter(Expense.payer_id == user.user_id, Expense.group_id == group_id).scalar() or 0
        owed = db.query(func.sum(ExpenseSplit.amount_owed)).filter(ExpenseSplit.user_id == user.user_id, ExpenseSplit.expense_id.in_(
            db.query(Expense.expense_id).filter(Expense.group_id == group_id)
        )).scalar() or 0
        repaid_out = db.query(func.sum(Settlement.amount)).filter(
            Settlement.payer_id == user.user_id,
            Settlement.group_id == group_id,
            Settlement.status == SettlementStatus.CONFIRMED
        ).scalar() or 0
        repaid_in = db.query(func.sum(Settlement.amount)).filter(
            Settlement.receiver_id == user.user_id,
            Settlement.group_id == group_id,
            Settlement.status == SettlementStatus.CONFIRMED
        ).scalar() or 0

        net_balances.append({"user_id": user.user_id, "balance": (paid - owed) + (repaid_in - repaid_out)})

    # 2. Debt Minimization Algorithm
    debtors = sorted([b for b in net_balances if b["balance"] < -0.01], key=lambda x: x["balance"])
    creditors = sorted([b for b in net_balances if b["balance"] > 0.01], key=lambda x: x["balance"], reverse=True)

    settlements = []
    d_idx, c_idx = 0, 0
    while d_idx < len(debtors) and c_idx < len(creditors):
        debtor = debtors[d_idx]
        creditor = creditors[c_idx]

        amount = min(-debtor["balance"], creditor["balance"])
        settlements.append(SettlementOut(
            settlement_id=0, # Suggested, not yet saved
            payer_id=debtor["user_id"],
            receiver_id=creditor["user_id"],
            amount=float(amount),
            status=SettlementStatus.PENDING,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        ))

        debtor["balance"] += amount
        creditor["balance"] -= amount

        if abs(debtor["balance"]) < 0.01: d_idx += 1
        if abs(creditor["balance"]) < 0.01: c_idx += 1

    return settlements
