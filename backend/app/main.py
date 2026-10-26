from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import auth, groups, expenses, balances, settlements
from .db.base import Base
from .db.session import engine

app = FastAPI(title="Group Expense and Debt Settlement Manager")

# CORS configuration - placed at the top to ensure it applies to all routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for development/capstone
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, DELETE, etc.)
    allow_headers=["*"], # Allow all headers
)

# Create tables
Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(balances.router)
app.include_router(settlements.router)

@app.get("/")
def root():
    return {"message": "Welcome to Group Expense Manager API"}
