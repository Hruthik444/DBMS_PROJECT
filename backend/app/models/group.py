from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.base import Base
# ensure related model is registered for SQLAlchemy relationship resolution
try:
    from .expense import Expense  # noqa: F401
except Exception:
    pass

class Group(Base):
    __tablename__ = "groups"
    group_id = Column(Integer, primary_key=True, index=True)
    group_name = Column(String(100), nullable=False)
    created_by = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("GroupMember", back_populates="group")
    expenses = relationship("Expense", back_populates="group")

class GroupMember(Base):
    __tablename__ = "group_members"
    group_id = Column(Integer, ForeignKey("groups.group_id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    role = Column(String(20), default="member")
    joined_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="groups")
    group = relationship("Group", back_populates="members")
