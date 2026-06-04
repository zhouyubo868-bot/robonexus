from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from auth import get_current_user
from database import get_db
from models import User, Robot, Task
from schemas import DashboardStatsResponse

router = APIRouter()


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取仪表盘统计数据

    根据 API.md 规范:
    - totalRobots: 当前用户的机器人总数
    - onlineRobots: 当前用户在线的机器人数量
    - alerts: 当前用户的告警数量(由错误级别日志数量确定)
    - tasksExecuted: 当前用户执行的任务总数
    """

    # 统计机器人总数
    total_robots_result = await db.execute(
        select(func.count(Robot.id)).filter(Robot.user_id == current_user.id)
    )
    total_robots = total_robots_result.scalar_one()

    # 统计在线机器人数量
    online_robots_result = await db.execute(
        select(func.count(Robot.id)).filter(
            Robot.user_id == current_user.id,
            Robot.status == "online"
        )
    )
    online_robots = online_robots_result.scalar_one()

    # 统计告警数量(通过错误级别日志计数)
    from models import Log
    alerts_result = await db.execute(
        select(func.count(Log.id)).filter(
            Log.user_id == current_user.id,
            Log.level == "error"
        )
    )
    alerts = alerts_result.scalar_one()

    # 统计任务执行总数
    tasks_executed_result = await db.execute(
        select(func.count(Task.id)).filter(Task.user_id == current_user.id)
    )
    tasks_executed = tasks_executed_result.scalar_one()

    return {
        "success": True,
        "data": {
            "totalRobots": total_robots,
            "onlineRobots": online_robots,
            "alerts": alerts,
            "tasksExecuted": tasks_executed
        }
    }
