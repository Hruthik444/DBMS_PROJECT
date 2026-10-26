# Group Expense and Debt Settlement Manager

A professional DBMS capstone project to manage shared expenses and optimize debt settlement.

## Tech Stack
- **Frontend**: React, Tailwind CSS
- **Backend**: FastAPI, SQLAlchemy
- **Database**: MySQL

## Setup Instructions

### Database Setup
1. Install MySQL Server.
2. Create a database named `expense_manager`.
3. Update the database connection string in `backend/app/db/session.py`:
   `DATABASE_URL = "mysql+pymysql://your_user:your_password@localhost:3306/expense_manager"`

### Backend Setup
1. Navigate to the backend directory:
   `cd backend`
2. Create a virtual environment:
   `python -m venv venv`
3. Activate virtual environment:
   - Windows: `venv\Scripts\activate`
   - Unix: `source venv/bin/activate`
4. Install dependencies:
   `pip install -r requirements.txt`
5. Run the server:
   `uvicorn app.main:app --reload`

### Frontend Setup
1. Navigate to the frontend directory:
   `cd frontend`
2. Install dependencies:
   `npm install`
3. Start the application:
   `npm start`

## Core Features
- **User Authentication**: Secure JWT-based login and registration.
- **Group Management**: Create and join groups to track shared costs.
- **Expense Tracking**: Add expenses with custom or equal splitting logic.
- **Smart Settlement**: Greedy algorithm to minimize the number of payments required to clear debts.
- **Financial Integrity**: MySQL 3NF normalization with transaction rollbacks for consistent data.
- **Modern UI**: Premium dark/light theme toggle, responsive dashboard, profile page, and glassmorphism login.
