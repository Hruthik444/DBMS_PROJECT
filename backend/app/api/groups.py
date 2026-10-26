from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models.group import Group, GroupMember
from ..models.expense import Expense, ExpenseSplit
from ..models.user import User
from ..core.auth import get_current_user

router = APIRouter(prefix="/groups", tags=["Groups"])

@router.post("/", response_model=None)
def create_group(group_in: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from ..schemas.schemas import GroupCreate
    group_data = GroupCreate(**group_in)
    new_group = Group(group_name=group_data.group_name, created_by=current_user.user_id)
    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    member = GroupMember(group_id=new_group.group_id, user_id=current_user.user_id, role="admin")
    db.add(member)
    db.commit()

    return new_group

@router.get("/{group_id}")
def get_group(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.group_id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if user is a member
    member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.user_id).first()
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    return {
        "group_id": group.group_id,
        "group_name": group.group_name,
        "is_creator": group.created_by == current_user.user_id
    }

@router.get("/{group_id}/members")
def get_group_members(group_id: int, db: Session = Depends(get_db)):
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    return members

@router.post("/{group_id}/join")
def join_group(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already a member of this group")

    member = GroupMember(group_id=group_id, user_id=current_user.user_id)
    db.add(member)
    db.commit()
    return {"message": "Joined group successfully"}

@router.delete("/{group_id}/leave")
def leave_group(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="You are not a member of this group")

    member_count = db.query(GroupMember).filter(GroupMember.group_id == group_id).count()
    if member_count <= 1:
        raise HTTPException(status_code=400, detail="Cannot leave the group as you are the last member. Delete the group instead.")

    db.delete(member)
    db.commit()
    return {"message": "Left group successfully"}

@router.delete("/{group_id}")
def delete_group(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.group_id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.created_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group creator has permission to delete the group"
        )

    try:
        expense_ids = db.query(Expense.expense_id).filter(Expense.group_id == group_id).all()
        expense_ids_list = [id[0] for id in expense_ids]

        if expense_ids_list:
            db.query(ExpenseSplit).filter(ExpenseSplit.expense_id.in_(expense_ids_list)).delete()

        db.query(Expense).filter(Expense.group_id == group_id).delete()
        db.query(GroupMember).filter(GroupMember.group_id == group_id).delete()
        db.delete(group)

        db.commit()
        return {"message": "Group and all its data deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during deletion: {str(e)}")

@router.get("/", response_model=None)
def list_my_groups(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    groups = db.query(Group).join(GroupMember).filter(GroupMember.user_id == current_user.user_id).all()
    return groups
