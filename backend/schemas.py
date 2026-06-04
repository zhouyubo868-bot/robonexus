"""
Pydantic schemas for RoboNexus API
定义所有请求和响应的数据模型
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum


# ==================== 枚举类型 ====================

class RobotStatus(str, Enum):
    """机器人状态"""
    online = "online"
    offline = "offline"
    maintenance = "maintenance"


class TaskStatus(str, Enum):
    """任务状态"""
    pending = "pending"
    running = "running"
    done = "done"
    failed = "failed"


class LogLevel(str, Enum):
    """日志级别"""
    info = "info"
    warn = "warn"
    error = "error"


class VerificationPurpose(str, Enum):
    """验证码用途"""
    email = "email"
    twofa = "2fa"


# ==================== 认证相关模式 ====================

class UserCreate(BaseModel):
    """用户注册请求"""
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    """用户登录请求"""
    email: EmailStr
    password: str = Field(..., min_length=6)


class VerifyCodeRequest(BaseModel):
    """验证码校验请求"""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
    pendingToken: Optional[str] = None
    purpose: VerificationPurpose = VerificationPurpose.email


class RefreshTokenRequest(BaseModel):
    """刷新 Token 请求"""
    refreshToken: str


class ForgotPasswordRequest(BaseModel):
    """找回密码请求"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """重置密码请求"""
    token: str
    newPassword: str = Field(..., min_length=6, max_length=128)


class ResendCodeRequest(BaseModel):
    """重发验证码请求"""
    email: EmailStr
    purpose: VerificationPurpose


# ==================== 用户响应模式 ====================

class UserData(BaseModel):
    """用户数据"""
    id: str
    name: str
    email: str
    createdAt: Optional[datetime] = None


class TokenData(BaseModel):
    """Token 数据"""
    token: str
    refreshToken: Optional[str] = None
    user: UserData


class SignupResponseData(BaseModel):
    """注册响应数据(需要邮箱验证时)"""
    requiresEmailVerification: Optional[bool] = None
    pendingToken: Optional[str] = None
    email: Optional[str] = None
    userId: Optional[str] = None
    token: Optional[str] = None
    user: Optional[UserData] = None


class LoginResponseData(BaseModel):
    """登录响应数据(可能需要 2FA)"""
    requiresTwoFactor: Optional[bool] = None
    pendingToken: Optional[str] = None
    email: Optional[str] = None
    token: Optional[str] = None
    refreshToken: Optional[str] = None
    user: Optional[UserData] = None


# ==================== 通用响应模式 ====================

class ErrorDetail(BaseModel):
    """错误详情"""
    code: str
    message: str


class SuccessResponse(BaseModel):
    """成功响应(仅消息)"""
    success: bool = True
    message: str


class TokenResponse(BaseModel):
    """Token 响应"""
    success: bool = True
    data: TokenData


class UserResponse(BaseModel):
    """用户响应"""
    success: bool = True
    data: UserData


class SignupResponse(BaseModel):
    """注册响应"""
    success: bool = True
    data: SignupResponseData


class LoginResponse(BaseModel):
    """登录响应"""
    success: bool = True
    data: LoginResponseData


class ErrorResponse(BaseModel):
    """错误响应"""
    success: bool = False
    error: ErrorDetail


# ==================== 机器人相关模式 ====================

class LocationData(BaseModel):
    """位置数据"""
    lat: float
    lng: float


class RobotCreate(BaseModel):
    """创建机器人请求"""
    name: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=50)
    serialNumber: str = Field(..., min_length=1, max_length=50)


class RobotUpdate(BaseModel):
    """更新机器人请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    model: Optional[str] = Field(None, min_length=1, max_length=50)
    status: Optional[RobotStatus] = None


class RobotData(BaseModel):
    """机器人数据(列表)"""
    id: str
    name: str
    status: RobotStatus
    battery: Optional[int] = None
    tasks: Optional[int] = None
    lastSeen: Optional[datetime] = None


class RobotDetailData(BaseModel):
    """机器人详情数据"""
    id: str
    name: str
    status: RobotStatus
    battery: Optional[int] = None
    tasks: Optional[int] = None
    lastSeen: Optional[datetime] = None
    model: Optional[str] = None
    firmware: Optional[str] = None
    location: Optional[LocationData] = None
    serialNumber: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


class RobotResponse(BaseModel):
    """机器人响应(单个)"""
    success: bool = True
    data: RobotDetailData


class RobotListResponse(BaseModel):
    """机器人列表响应"""
    success: bool = True
    data: List[RobotData]


# ==================== 任务相关模式 ====================

class TaskCreate(BaseModel):
    """创建任务请求"""
    robotId: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)


class TaskData(BaseModel):
    """任务数据"""
    id: str
    robotId: str
    robotName: Optional[str] = None
    type: str
    status: TaskStatus
    progress: Optional[int] = Field(None, ge=0, le=100)
    createdAt: datetime
    updatedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    description: Optional[str] = None


class TaskResponse(BaseModel):
    """任务响应(单个)"""
    success: bool = True
    data: TaskData


class TaskListResponse(BaseModel):
    """任务列表响应"""
    success: bool = True
    data: List[TaskData]


# ==================== 日志相关模式 ====================

class LogQueryParams(BaseModel):
    """日志查询参数"""
    robotId: Optional[str] = None
    level: Optional[LogLevel] = None
    keyword: Optional[str] = None
    limit: Optional[int] = Field(default=100, ge=1, le=1000)


class LogData(BaseModel):
    """日志数据"""
    id: str
    robotId: str
    robotName: Optional[str] = None
    level: LogLevel
    message: str
    time: datetime
    metadata: Optional[Dict[str, Any]] = None


class LogResponse(BaseModel):
    """日志响应"""
    success: bool = True
    data: List[LogData]


# ==================== 统计相关模式 ====================

class DashboardStatsData(BaseModel):
    """仪表盘统计数据"""
    totalRobots: int
    onlineRobots: int
    alerts: int
    tasksExecuted: int


class DashboardStatsResponse(BaseModel):
    """仪表盘统计响应"""
    success: bool = True
    data: DashboardStatsData


# Alias for compatibility
StatsResponse = DashboardStatsResponse


# ==================== WebSocket 消息模式 ====================

class WSTaskProgress(BaseModel):
    """WebSocket 任务进度推送"""
    type: str = "task:progress"
    data: Dict[str, Any]  # { "id": "TK-1001", "progress": 75, "status": "running" }


class WSRobotStatus(BaseModel):
    """WebSocket 机器人状态推送"""
    type: str = "robot:status"
    data: Dict[str, Any]  # { "id": "RB-001", "status": "online", "battery": 87 }


# ==================== 配置和验证 ====================

class Config:
    """Pydantic 配置"""
    json_encoders = {
        datetime: lambda v: v.isoformat() if v else None
    }
    use_enum_values = True
