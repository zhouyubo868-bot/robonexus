"""
日志查询路由
实现日志查询功能,支持按机器人、级别、关键词筛选
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, and_

from auth import get_current_user
from database import get_db
from models import Log, User
from schemas import LogResponse, LogData, LogLevel

router = APIRouter()


@router.get("", response_model=LogResponse)
async def get_logs(
    robotId: Optional[str] = Query(None, description="按机器人ID筛选"),
    level: Optional[LogLevel] = Query(None, description="按级别筛选: info/warn/error"),
    keyword: Optional[str] = Query(None, description="按消息关键词模糊匹配"),
    limit: int = Query(100, ge=1, le=1000, description="返回条数上限,默认100"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    查询日志

    支持以下筛选条件(全部可选):
    - robotId: 按机器人筛选
    - level: 按级别筛选 (info/warn/error)
    - keyword: 按消息关键词模糊匹配
    - limit: 返回条数上限,默认100

    返回结果按时间倒序排列
    """
    # 构建查询条件
    conditions = [Log.user_id == current_user.id]

    # 按机器人ID筛选
    if robotId is not None:
        try:
            robot_id_int = int(robotId.replace("RB-", ""))
            conditions.append(Log.robot_id == robot_id_int)
        except ValueError:
            # 如果robotId格式不正确,直接使用原值尝试匹配
            conditions.append(Log.robot_id == int(robotId))

    # 按日志级别筛选
    if level is not None:
        conditions.append(Log.level == level.value)

    # 按关键词模糊匹配
    if keyword is not None and keyword.strip():
        conditions.append(Log.message.ilike(f"%{keyword}%"))

    # 执行查询,按时间倒序,应用 limit
    result = await db.execute(
        select(Log)
        .filter(and_(*conditions))
        .order_by(desc(Log.time))
        .limit(limit)
    )
    logs = result.scalars().all()

    # 转换为响应格式
    log_data_list: List[LogData] = []
    for log in logs:
        log_data_list.append(
            LogData(
                id=f"LOG-{log.id}",
                robotId=f"RB-{log.robot_id:03d}",
                robotName=log.robot_name,
                level=LogLevel(log.level),
                message=log.message,
                time=log.time,
                metadata=None
            )
        )

    return LogResponse(success=True, data=log_data_list)
