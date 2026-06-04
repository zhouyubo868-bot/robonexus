from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    robots = relationship("Robot", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    logs = relationship("Log", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_user_email', 'email'),
        Index('idx_user_created_at', 'created_at'),
    )


class Robot(Base):
    __tablename__ = 'robots'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)
    battery = Column(Integer, nullable=False)
    tasks = Column(Integer, default=0, nullable=False)
    last_seen = Column(DateTime(timezone=True), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    is_custom = Column(Boolean, default=False, nullable=False)
    form = Column(String(50), nullable=True)
    stats_json = Column(Text, nullable=True)
    skills_json = Column(Text, nullable=True)
    parts_json = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="robots")

    __table_args__ = (
        Index('idx_robot_user_id', 'user_id'),
        Index('idx_robot_status', 'status'),
        Index('idx_robot_last_seen', 'last_seen'),
        Index('idx_robot_user_custom', 'user_id', 'is_custom'),
    )


class Task(Base):
    __tablename__ = 'tasks'

    id = Column(Integer, primary_key=True, index=True)
    robot_id = Column(String(64), nullable=False)
    robot_name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)
    progress = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Relationships
    user = relationship("User", back_populates="tasks")

    __table_args__ = (
        Index('idx_task_user_id', 'user_id'),
        Index('idx_task_robot_id', 'robot_id'),
        Index('idx_task_status', 'status'),
        Index('idx_task_created_at', 'created_at'),
        Index('idx_task_user_robot', 'user_id', 'robot_id'),
    )


class Log(Base):
    __tablename__ = 'logs'

    id = Column(Integer, primary_key=True, index=True)
    robot_id = Column(String(64), nullable=False)
    robot_name = Column(String(255), nullable=False)
    level = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    time = Column(DateTime(timezone=True), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Relationships
    user = relationship("User", back_populates="logs")

    __table_args__ = (
        Index('idx_log_user_id', 'user_id'),
        Index('idx_log_robot_id', 'robot_id'),
        Index('idx_log_level', 'level'),
        Index('idx_log_time', 'time'),
        Index('idx_log_user_robot', 'user_id', 'robot_id'),
    )


class VerificationCode(Base):
    __tablename__ = 'verification_codes'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    code = Column(String(10), nullable=False)
    purpose = Column(String(50), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index('idx_verification_email', 'email'),
        Index('idx_verification_code', 'code'),
        Index('idx_verification_expires', 'expires_at'),
        Index('idx_verification_email_purpose', 'email', 'purpose'),
    )


class RefreshToken(Base):
    __tablename__ = 'refresh_tokens'

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")

    __table_args__ = (
        Index('idx_refresh_token', 'token'),
        Index('idx_refresh_user_id', 'user_id'),
        Index('idx_refresh_expires', 'expires_at'),
    )

