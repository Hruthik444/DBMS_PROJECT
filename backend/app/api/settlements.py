from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime
from ..db.session import get_db
from ..models.expense import Settlement, SettlementAudit, SettlementStatus
from ..models.user import User
from ..models.group import GroupMember
from ..schemas.schemas import SettlementOut, SettlementCreate, SettlementConfirm, SettlementDispute, SettlementCancel
from ..core.auth import get_current_user

router = APIRouter(prefix="/settlements", tags=["Settlements"])

def verify_group_membership(db: Session, group_id: int, user_id: int):
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    return member

def get_user_debt_to_receiver(db: Session, group_id: int, payer_id: int, receiver_id: int):
    """
    Calculates how much the payer currently owes the receiver in a group,
    considering expenses and confirmed repayments.
    """
    # 1. Amount payer owes receiver from expenses
    # This is tricky: expenses are usually split among many.
    # We calculate (Total payer owes in group) - (Total payer owes others in group)
    # But simpler: use the balance logic.
    # Current debt of payer to receiver is not explicitly stored per-pair.
    # We define 'outstanding debt' as the payer's net balance relative to the group.

    # To strictly enforce "reject amounts that exceed debt to that receiver",
    # we need to see if the payer's total net balance is negative enough.

    # Calculate Payer's Net Balance in Group
    paid = db.query(func.sum(Expense.amount)).filter(Expense.payer_id == payer_id, Expense.group_id == group_id).scalar() or 0
    owed = db.query(func.sum(ExpenseSplit.amount_owed)).filter(ExpenseSplit.user_id == payer_id, ExpenseSplit.expense_id.in_(
        db.query(Expense.expense_id).filter(Expense.group_id == group_id)
    )).scalar() or 0
    repaid_out = db.query(func.sum(Settlement.amount)).filter(
        Settlement.payer_id == payer_id,
        Settlement.group_id == group_id,
        Settlement.status == SettlementStatus.CONFIRMED
    ).scalar() or 0
    repaid_in = db.query(func.sum(Settlement.amount)).filter(
        Settlement.receiver_id == payer_id,
        Settlement.group_id == group_id,
        Settlement.status == SettlementStatus.CONFIRMED
    ).scalar() or 0

    return (paid - owed) + (repaid_in - repaid_out)

@router.post("/", response_model=SettlementOut)
def create_repayment(
    settlement_in: SettlementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_group_membership(db, settlement_in.group_id, current_user.user_id)

    receiver_member = db.query(GroupMember).filter(
        GroupMember.group_id == settlement_in.group_id,
        GroupMember.user_id == settlement_in.receiver_id
    ).first()
    if not receiver_member:
        raise HTTPException(status_code=400, detail="Receiver is not a member of the specified group")

    if current_user.user_id == settlement_in.receiver_id:
        raise HTTPException(status_code=400, detail="You cannot pay yourself")

    if settlement_in.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be positive")

    try:
        new_settlement = Settlement(
            group_id=settlement_in.group_id,
            payer_id=current_user.user_id,
            receiver_id=settlement_in.receiver_id,
            amount=settlement_in.amount,
            note=settlement_in.note,
            status=SettlementStatus.PENDING
        )
        db.add(new_settlement)
        db.commit()
        db.refresh(new_settlement)

        audit = SettlementAudit(
            settlement_id=new_settlement.settlement_id,
            old_status=None,
            new_status=SettlementStatus.PENDING,
            changed_by=current_user.user_id,
            action_details="Initial repayment request created"
        )
        db.add(audit)
        db.commit()

        return new_settlement
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/group/{group_id}", response_model=List[SettlementOut])
def list_group_repayments(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_group_membership(db, group_id, current_user.user_id)
    return db.query(Settlement).filter(Settlement.group_id == group_id).all()

@router.post("/{settlement_id}/confirm", response_model=SettlementOut)
def confirm_repayment(
    settlement_id: int,
    _confirm_in: SettlementConfirm = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Start a transaction with row-level locking for the settlement
    try:
        # SELECT ... FOR UPDATE prevents other transactions from modifying this settlement
        settlement = db.query(Settlement).filter(Settlement.settlement_id == settlement_id).with_for_update().first()

        if not settlement:
            raise HTTPException(status_code=404, detail="Settlement not found")

        # Only receiver can confirm
        if settlement.receiver_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Only the receiver can confirm this payment")

        # State Validation: Only PENDING payments can be confirmed
        if settlement.status != SettlementStatus.PENDING:
            raise HTTPException(status_code=400, detail="Only pending payments can be confirmed")

        # Financial Validation: check if amount exceeds outstanding debt
        # Note: In a multi-person group, 'debt to receiver' is inferred from net balances
        # if the system doesn't track specific bilateral debts.
        # For this implementation, we verify that the payment doesn't result in a positive balance for the payer
        # (which would mean they overpaid the group).

        # Calculate payer's net balance using the a helper or the balance logic
        # We use the balance logic to see if they still owe money overall.
        from ..api.balances import get_group_balances # Avoid circular import in a real app, but for this task:

        # Since we can't easily call the router function, we implement the balance check here.
        # 1. Gross paid by payer
        paid = db.query(func.sum(Expense.amount)).filter(Expense.payer_id == settlement.payer_id, Expense.group_id == settlement.group_id).scalar() or 0
        # 2. Gross owed by payer
        owed = db.query(func.sum(ExpenseSplit.amount_owed)).filter(ExpenseSplit.user_id == settlement.payer_id, ExpenseSplit.expense_id.in_(
            db.query(Expense.expense_id).filter(Expense.group_id == settlement.group_id)
        )).scalar() or 0
        # 3. Confirmed repayments out
        repaid_out = db.query(func.sum(Settlement.amount)).filter(
            Settlement.payer_id == settlement.payer_id,
            Settlement.group_id == settlement.group_id,
            Settlement.status == SettlementStatus.CONFIRMED
        ).scalar() or 0
        # 4. Confirmed repayments in
        repaid_in = db.query(func.sum(Settlement.amount)).filter(
            Settlement.receiver_id == settlement.payer_id,
            Settlement.group_id == settlement.group_id,
            Settlement.status == SettlementStatus.CONFIRMED
        ).scalar() or 0

        current_net = (paid - owed) + (repaid_in - repaid_out)

        # If current_net is already >= 0, they don't owe anything to the group.
        # If current_net is -10, and they pay 50, they overpay.
        if current_net + settlement.amount > 0.01:
            raise HTTPException(status_code=400, detail="Repayment amount exceeds the payer's outstanding debt to the group")

        # ATOMIC UPDATE
        old_status = settlement.status
        settlement.status = SettlementStatus.CONFIRMED
        settlement.confirmed_at = datetime.utcnow()

        audit = SettlementAudit(
            settlement_id=settlement.settlement_id,
            old_status=old_status,
            new_status=SettlementStatus.CONFIRMED,
            changed_by=current_user.user_id,
            action_details="Payment confirmed by receiver"
        )
        db.add(audit)

        db.commit()
        db.refresh(settlement)
        return settlement
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{settlement_id}/dispute", response_model=SettlementOut)
def dispute_repayment(
    settlement_id: int,
    dispute_in: SettlementDispute,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        settlement = db.query(Settlement).filter(Settlement.settlement_id == settlement_id).with_for_update().first()
        if not settlement:
            raise HTTPException(status_code=404, detail="Settlement not found")

        if settlement.receiver_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Only the receiver can dispute this payment")

        if settlement.status != SettlementStatus.PENDING:
            raise HTTPException(status_code=400, detail="Only pending payments can be disputed")

        old_status = settlement.status
        settlement.status = SettlementStatus.DISPUTED
        settlement.dispute_reason = dispute_in.reason
        settlement.disputed_at = datetime.utcnow()

        audit = SettlementAudit(
            settlement_id=settlement.settlement_id,
            old_status=old_status,
            new_status=SettlementStatus.DISPUTED,
            changed_by=current_user.user_id,
            action_details=f"Payment disputed: {dispute_in.reason}"
        )
        db.add(audit)
        db.commit()
        db.refresh(settlement)
        return settlement
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{settlement_id}/cancel", response_model=SettlementOut)
def cancel_repayment(
    settlement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        settlement = db.query(Settlement).filter(Settlement.settlement_id == settlement_id).with_for_update().first()
        if not settlement:
            raise HTTPException(status_code=404, detail="Settlement not found")

        if settlement.payer_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Only the payer can cancel this payment")

        if settlement.status != SettlementStatus.PENDING:
            raise HTTPException(status_code=400, detail="Only pending payments can be cancelled")

        db.delete(settlement)
        db.commit()
        return {"message": "Repayment request cancelled successfully"}
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))
