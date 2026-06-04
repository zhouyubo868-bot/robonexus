"""
Robot routes for RoboNexus API
机器人管理路由：列出、查看、创建、更新、删除机器人
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from typing import List
from datetime import datetime

from auth import get_current_user
from database import get_db
from models import User, Robot
from schemas import (
    RobotCreate,
    RobotUpdate,
    RobotData,
    RobotDetailData,
    RobotResponse,
    RobotListResponse,
    SuccessResponse,
    RobotStatus
)

router = APIRouter()


@router.get("", response_model=RobotListResponse)
async def list_robots(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    GET /robots
    列出当前用户的所有机器人
    """
    result = await db.execute(
        select(Robot).filter(Robot.user_id == current_user.id)
    )
    robots = result.scalars().all()

    robot_list = [
        RobotData(
            id=str(robot.id),
            name=robot.name,
            status=RobotStatus(robot.status),
            battery=robot.battery,
            tasks=robot.tasks,
            lastSeen=robot.last_seen
        )
        for robot in robots
    ]

    return RobotListResponse(success=True, data=robot_list)


@router.get("/{robot_id}", response_model=RobotResponse)
async def get_robot(
    robot_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    GET /robots/:id
    获取单个机器人详情
    """
    result = await db.execute(
        select(Robot).filter(
            and_(
                Robot.id == robot_id,
                Robot.user_id == current_user.id
            )
        )
    )
    robot = result.scalar_one_or_none()

    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found"
        )

    robot_detail = RobotDetailData(
        id=str(robot.id),
        name=robot.name,
        status=RobotStatus(robot.status),
        battery=robot.battery,
        tasks=robot.tasks,
        lastSeen=robot.last_seen,
        model=robot.form,
        firmware=None,  # 可以从 stats_json 中解析
        location=None,  # 可以从 stats_json 中解析
        serialNumber=None,  # 可以添加到模型中
        createdAt=None,  # 可以添加到模型中
        updatedAt=None  # 可以添加到模型中
    )

    return RobotResponse(success=True, data=robot_detail)


@router.post("", response_model=RobotResponse, status_code=status.HTTP_201_CREATED)
async def create_robot(
    robot_data: RobotCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    POST /robots
    创建新机器人
    """
    new_robot = Robot(
        name=robot_data.name,
        status="offline",  # 默认离线状态
        battery=100,  # 默认满电
        tasks=0,  # 默认无任务
        last_seen=datetime.utcnow(),
        user_id=current_user.id,
        is_custom=True,  # 用户创建的为自定义机器人
        form=robot_data.model  # 使用 model 字段作为 form
    )

    db.add(new_robot)
    await db.commit()
    await db.refresh(new_robot)

    robot_detail = RobotDetailData(
        id=str(new_robot.id),
        name=new_robot.name,
        status=RobotStatus(new_robot.status),
        battery=new_robot.battery,
        tasks=new_robot.tasks,
        lastSeen=new_robot.last_seen,
        model=new_robot.form,
        firmware=None,
        location=None,
        serialNumber=robot_data.serialNumber,
        createdAt=datetime.utcnow(),
        updatedAt=None
    )

    return RobotResponse(success=True, data=robot_detail)


@router.patch("/{robot_id}", response_model=RobotResponse)
async def update_robot(
    robot_id: int,
    robot_data: RobotUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    PATCH /robots/:id
    更新机器人信息
    """
    result = await db.execute(
        select(Robot).filter(
            and_(
                Robot.id == robot_id,
                Robot.user_id == current_user.id
            )
        )
    )
    robot = result.scalar_one_or_none()

    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found"
        )

    # 更新字段
    if robot_data.name is not None:
        robot.name = robot_data.name
    if robot_data.model is not None:
        robot.form = robot_data.model
    if robot_data.status is not None:
        robot.status = robot_data.status.value

    await db.commit()
    await db.refresh(robot)

    robot_detail = RobotDetailData(
        id=str(robot.id),
        name=robot.name,
        status=RobotStatus(robot.status),
        battery=robot.battery,
        tasks=robot.tasks,
        lastSeen=robot.last_seen,
        model=robot.form,
        firmware=None,
        location=None,
        serialNumber=None,
        createdAt=None,
        updatedAt=datetime.utcnow()
    )

    return RobotResponse(success=True, data=robot_detail)


@router.delete("/{robot_id}", response_model=SuccessResponse)
async def delete_robot(
    robot_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    DELETE /robots/:id
    删除机器人
    """
    result = await db.execute(
        select(Robot).filter(
            and_(
                Robot.id == robot_id,
                Robot.user_id == current_user.id
            )
        )
    )
    robot = result.scalar_one_or_none()

    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found"
        )

    await db.delete(robot)
    await db.commit()

    return SuccessResponse(success=True, message="Robot deleted successfully")
