"""
WebSocket 实时推送
- 管理连接（按 user_id 分组）
- 广播消息给指定用户
- 后台任务模拟真实推送，数据格式严格对齐前端 realtime.js 协议
"""
import asyncio
import json
import random
from datetime import datetime
from typing import Dict, List, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.future import select

from auth import decode_token
from database import AsyncSessionLocal
from models import Robot, Task

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # {user_id: [websocket, ...]}
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        conns = self.active_connections.get(user_id)
        if conns and websocket in conns:
            conns.remove(websocket)
        if conns is not None and not conns:
            del self.active_connections[user_id]

    async def broadcast_to_user(self, user_id: str, message_type: str, data: dict):
        """广播给指定用户的所有连接，格式 {type, data} 对齐前端协议"""
        conns = self.active_connections.get(user_id)
        if not conns:
            return
        message = {"type": message_type, "data": data}
        dead = []
        for conn in conns:
            try:
                await conn.send_json(message)
            except Exception:
                dead.append(conn)
        for conn in dead:
            self.disconnect(conn, user_id)

    def get_connected_users(self) -> Set[str]:
        return set(self.active_connections.keys())


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(default="")):
    """WebSocket 端点，?token=xxx 鉴权"""
    user_id = None
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, user_id)
    await websocket.send_json({
        "type": "connection:established",
        "data": {"userId": user_id, "time": datetime.utcnow().isoformat()}
    })

    try:
        while True:
            # 保持连接，忽略客户端消息内容
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception:
        manager.disconnect(websocket, user_id)


# ---------- 后台模拟推送 ----------
STATUSES = ["online", "offline", "error"]
ALERT_TEMPLATES = [
    ("critical", "电量过低，即将停机"),
    ("critical", "检测到电机故障"),
    ("warning", "温度偏高"),
    ("warning", "信号弱，通信不稳定"),
    ("info", "固件有可用更新"),
]


async def _fetch_user_robots(user_id: str):
    """读取该用户的机器人（用于生成可信的推送数据）"""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Robot).filter(Robot.user_id == int(user_id))
        )
        return result.scalars().all()


async def simulate_realtime_updates():
    """后台任务：每 2-4 秒为每个在线用户推送一条可信的实时事件"""
    while True:
        try:
            await asyncio.sleep(random.uniform(2.0, 4.0))
            for user_id in list(manager.get_connected_users()):
                robots = await _fetch_user_robots(user_id)
                if not robots:
                    continue
                robot = random.choice(robots)
                roll = random.random()

                if roll < 0.4:
                    # 任务计数 +1
                    robot_tasks = (robot.tasks or 0) + 1
                    await manager.broadcast_to_user(
                        user_id, "robot:task", {"id": robot.id, "tasks": robot_tasks}
                    )
                elif roll < 0.7:
                    # 电量波动
                    battery = max(0, min(100, (robot.battery or 100) + random.randint(-3, 2)))
                    await manager.broadcast_to_user(
                        user_id, "robot:battery", {"id": robot.id, "battery": battery}
                    )
                elif roll < 0.9:
                    # 状态切换
                    new_status = random.choice([s for s in STATUSES if s != robot.status])
                    await manager.broadcast_to_user(
                        user_id, "robot:status", {"id": robot.id, "status": new_status}
                    )
                else:
                    # 告警
                    level, msg = random.choice(ALERT_TEMPLATES)
                    await manager.broadcast_to_user(user_id, "alert", {
                        "id": f"alt_{int(datetime.utcnow().timestamp() * 1000)}",
                        "robotId": robot.id,
                        "robotName": robot.name,
                        "level": level,
                        "message": msg,
                        "time": datetime.utcnow().isoformat(),
                    })
        except Exception as e:
            print(f"simulate_realtime_updates error: {e}")
            await asyncio.sleep(1)
