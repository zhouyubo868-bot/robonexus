"""
任务调度路由
实现任务的创建、查询和取消功能
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from auth import get_current_user
from database import get_db
from models import Task, Robot, User
from schemas import (
    TaskCreate,
    TaskData,
    TaskResponse,
    TaskListResponse,
    SuccessResponse,
    TaskStatus
)

router = APIRouter()


@router.get("", response_model=TaskListResponse)
async def get_tasks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取当前用户的任务列表
    按 created_at 倒序排序
    """
    # 查询当前用户的所有任务,按创建时间倒序
    result = await db.execute(
        select(Task)
        .filter(Task.user_id == current_user.id)
        .order_by(desc(Task.created_at))
    )
    tasks = result.scalars().all()

    # 转换为响应格式
    task_data_list: List[TaskData] = []
    for task in tasks:
        task_data_list.append(TaskData(
            id=str(task.id),
            robotId=str(task.robot_id),
            robotName=task.robot_name,
            type=task.type,
            status=TaskStatus(task.status),
            progress=task.progress,
            createdAt=task.created_at
        ))

    return TaskListResponse(success=True, data=task_data_list)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_create: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    创建新任务
    初始状态为 pending,进度为 0
    robotId 为字符串,兼容后端机器人主键和前端自定义机器人 ID
    """
    robot_id = task_create.robotId

    # 尝试匹配后端机器人(按主键),拿到机器人名字;匹配不到则用 robotId 占位
    robot_name = robot_id
    if robot_id.isdigit():
        result = await db.execute(
            select(Robot).filter(
                Robot.id == int(robot_id),
                Robot.user_id == current_user.id
            )
        )
        robot = result.scalar_one_or_none()
        if robot:
            robot_name = robot.name

    # 创建任务
    new_task = Task(
        robot_id=robot_id,
        robot_name=robot_name,
        type=task_create.type,
        status="pending",
        progress=0,
        user_id=current_user.id
    )

    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)

    # 返回创建的任务
    task_data = TaskData(
        id=str(new_task.id),
        robotId=str(new_task.robot_id),
        robotName=new_task.robot_name,
        type=new_task.type,
        status=TaskStatus(new_task.status),
        progress=new_task.progress,
        createdAt=new_task.created_at
    )

    return TaskResponse(success=True, data=task_data)


@router.delete("/{task_id}", response_model=SuccessResponse)
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    取消/删除任务
    只能删除属于当前用户的任务
    """
    # 查询任务是否存在且属于当前用户
    result = await db.execute(
        select(Task).filter(
            Task.id == task_id,
            Task.user_id == current_user.id
        )
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在或无权访问"
        )

    # 删除任务
    await db.delete(task)
    await db.commit()

    return SuccessResponse(success=True, message="任务已取消")

