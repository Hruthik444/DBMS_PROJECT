from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models.expense import Expense, ExpenseSplit
from ..models.user import User
from ..schemas.schemas import ExpenseCreate, ExpenseOut
from ..core.auth import get_current_user

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.post("/", response_model=ExpenseOut)
def add_expense(expense_in: ExpenseCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify user is in the group
    from ..models.group import GroupMember
    member = db.query(GroupMember).filter(GroupMember.group_id == expense_in.group_id, GroupMember.user_id == current_user.user_id).first()
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    try:
        # Start transaction
        new_expense = Expense(
            group_id=expense_in.group_id,
            payer_id=expense_in.payer_id,
            description=expense_in.description,
            amount=expense_in.amount,
            category=expense_in.category
        )
        db.add(new_expense)
        db.flush() # Get expense_id

        total_split_amount = 0
        for split in expense_in.splits:
            new_split = ExpenseSplit(
                expense_id=new_expense.expense_id,
                user_id=split.user_id,
                amount_owed=split.amount
            )
            db.add(new_split)
            total_split_amount += split.amount

        if abs(total_split_amount - expense_in.amount) > 0.01:
            raise HTTPException(status_code=400, detail="Split amounts must equal total expense amount")

        db.commit()
        db.refresh(new_expense)
        return new_expense
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/group/{group_id}", response_model=list[ExpenseOut])
def get_group_expenses(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from ..models.group import GroupMember
    member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.user_id).first()
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    return db.query(Expense).filter(Expense.group_id == group_id).all()
