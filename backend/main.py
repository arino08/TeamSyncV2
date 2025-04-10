from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Union, Dict, Any
from enum import Enum
from sqlalchemy import create_engine, Column, String, Boolean, ForeignKey, func, DateTime, text
from sqlalchemy.dialects.mysql import CHAR, ENUM, TEXT
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
from passlib.context import CryptContext  # For password hashing

# Load environment variables
load_dotenv()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Get database URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL",
                         f"mysql+pymysql://{os.getenv('DB_USER', 'root')}:{os.getenv('DB_PASSWORD', '')}@"
                         f"{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '3306')}/"
                         f"{os.getenv('DB_NAME', 'teamsync')}")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    echo=bool(os.getenv("SQL_ECHO", False)),
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Enum for task status
class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    completed = "completed"

# Enum for subtask status
class SubtaskStatus(str, Enum):
    todo = "todo"
    completed = "completed"

# Enum for user roles
class UserRole(str, Enum):
    manager = "manager"
    member = "member"

# Helper function to generate UUIDs
def generate_uuid():
    return str(uuid.uuid4())

# Database Models - Only for mapping to existing tables, no creation
class ProfileDB(Base):
    __tablename__ = "profiles"
    id = Column(CHAR(36), primary_key=True)
    name = Column(TEXT, nullable=False)
    role = Column(ENUM('manager', 'member'), nullable=False, default="member")
    created_at = Column(DateTime)

    # Relationships
    auth_user = relationship("AuthUserDB", back_populates="profile", uselist=False)
    tasks = relationship("TaskDB", back_populates="assignee")
    managed_workspaces = relationship("WorkspaceDB", back_populates="manager")

class AuthUserDB(Base):
    __tablename__ = "auth_users"
    id = Column(CHAR(36), ForeignKey("profiles.id"), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    salt = Column(String(255), nullable=False)
    created_at = Column(DateTime)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    profile = relationship("ProfileDB", back_populates="auth_user")

class WorkspaceDB(Base):
    __tablename__ = "workspaces"
    id = Column(CHAR(36), primary_key=True)
    name = Column(TEXT, nullable=False)
    manager_id = Column(CHAR(36), ForeignKey("profiles.id"), nullable=False)
    created_at = Column(DateTime)

    # Relationships
    tasks = relationship("TaskDB", back_populates="workspace")
    manager = relationship("ProfileDB", back_populates="managed_workspaces")

class TaskDB(Base):
    __tablename__ = "tasks"
    id = Column(CHAR(36), primary_key=True)
    workspace_id = Column(CHAR(36), ForeignKey("workspaces.id"), nullable=False)
    assigned_to = Column(CHAR(36), ForeignKey("profiles.id"), nullable=False)
    title = Column(TEXT, nullable=False)
    description = Column(TEXT, nullable=True)
    status = Column(ENUM('todo', 'in_progress', 'completed'), default="todo")
    created_at = Column(DateTime)

    # Relationships
    workspace = relationship("WorkspaceDB", back_populates="tasks")
    assignee = relationship("ProfileDB", back_populates="tasks")
    subtasks = relationship("SubtaskDB", back_populates="task")

class SubtaskDB(Base):
    __tablename__ = "subtasks"
    id = Column(CHAR(36), primary_key=True)
    task_id = Column(CHAR(36), ForeignKey("tasks.id"), nullable=False)
    title = Column(TEXT, nullable=False)
    status = Column(ENUM('todo', 'completed'), default="todo")
    created_at = Column(DateTime)

    # Relationships
    task = relationship("TaskDB", back_populates="subtasks")

class WorkspaceMemberDB(Base):
    __tablename__ = "workspace_members"
    id = Column(CHAR(36), primary_key=True)
    workspace_id = Column(CHAR(36), ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(CHAR(36), ForeignKey("profiles.id"), nullable=False)
    role = Column(ENUM('manager', 'member'), default="member")  # Updated to match database schema
    created_at = Column(DateTime)

    # Relationships
    workspace = relationship("WorkspaceDB", backref="members")
    user = relationship("ProfileDB", backref="workspace_memberships")

# Helper functions for password handling
def verify_password(plain_password: str, hashed_password: str, salt: str) -> bool:
    return pwd_context.verify(plain_password + salt, hashed_password)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models for API
class Subtask(BaseModel):
    id: str
    title: str
    status: SubtaskStatus
    created_at: datetime

    class Config:
        from_attributes = True

class Task(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: TaskStatus
    workspace: str
    assignee: str
    created_at: datetime
    subtasks: Optional[List[Subtask]] = None

    class Config:
        from_attributes = True

class WorkspaceStats(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    overdue_tasks: int
    workspace_count: int
    team_member_count: int

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole

    class Config:
        from_attributes = True

app = FastAPI(title="TeamSync API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173"],  # Added Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
@app.get("/")
def read_root():
    return {"message": "Welcome to TeamSync API - Read-Only Mode"}

# Authentication endpoint
@app.post("/api/auth/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    auth_user = db.query(AuthUserDB).filter(AuthUserDB.email == user_data.email).first()
    if not auth_user or not verify_password(user_data.password, auth_user.password_hash, auth_user.salt):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    profile = db.query(ProfileDB).filter(ProfileDB.id == auth_user.id).first()

    return {
        "id": profile.id,
        "name": profile.name,
        "email": auth_user.email,
        "role": profile.role
    }

@app.get("/api/tasks", response_model=List[Task])
def get_tasks(db: Session = Depends(get_db)):
    try:
        db_tasks = db.query(TaskDB).all()
        tasks = []

        for task in db_tasks:
            # Get workspace name and assignee name
            workspace_name = task.workspace.name if task.workspace else "Unknown"
            assignee_name = task.assignee.name if task.assignee else "Unassigned"

            tasks.append({
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "workspace": workspace_name,
                "assignee": assignee_name,
                "created_at": task.created_at,
                "subtasks": [
                    {
                        "id": subtask.id,
                        "title": subtask.title,
                        "status": subtask.status,
                        "created_at": subtask.created_at
                    }
                    for subtask in task.subtasks
                ]
            })

        return tasks
    except Exception as e:
        print(f"Error in get_tasks: {e}")
        return []

@app.get("/api/statistics", response_model=WorkspaceStats)
def get_statistics(db: Session = Depends(get_db)):
    try:
        # Count tasks
        total_tasks = db.query(func.count(TaskDB.id)).scalar() or 0
        completed_tasks = db.query(func.count(TaskDB.id)).filter(TaskDB.status == "completed").scalar() or 0
        in_progress_tasks = db.query(func.count(TaskDB.id)).filter(TaskDB.status == "in_progress").scalar() or 0
        pending_tasks = total_tasks - completed_tasks

        # For demonstration, we'll count todo tasks as "overdue" since there's no due date in schema
        overdue_tasks = db.query(func.count(TaskDB.id)).filter(TaskDB.status == "todo").scalar() or 0

        # Count workspaces
        workspace_count = db.query(func.count(WorkspaceDB.id)).scalar() or 0

        # Count unique team members
        team_member_count = db.query(func.count(ProfileDB.id)).scalar() or 0

        return WorkspaceStats(
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            pending_tasks=pending_tasks,
            overdue_tasks=overdue_tasks,
            workspace_count=workspace_count,
            team_member_count=team_member_count
        )
    except Exception as e:
        print(f"Error in get_statistics: {e}")
        return WorkspaceStats(
            total_tasks=0,
            completed_tasks=0,
            pending_tasks=0,
            overdue_tasks=0,
            workspace_count=0,
            team_member_count=0
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=os.getenv("API_HOST", "0.0.0.0"), port=int(os.getenv("API_PORT", 8000)), reload=True)
