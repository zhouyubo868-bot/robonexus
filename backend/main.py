from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import engine
from models import Base
from routes import auth_routes, robot_routes, task_routes, log_routes, stats_routes
from websocket import router as websocket_router, simulate_realtime_updates


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理：启动时创建数据库表并启动后台推送任务"""
    # 创建所有表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # 启动 WebSocket 模拟推送后台任务
    import asyncio
    sim_task = asyncio.create_task(simulate_realtime_updates())
    yield
    # 关闭时清理
    sim_task.cancel()
    await engine.dispose()


app = FastAPI(
    title="RoboNexus API",
    description="机器人控制台后端 API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 中间件 - 允许前端域名
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册所有路由
app.include_router(auth_routes.router, prefix="/api/auth", tags=["认证"])
app.include_router(robot_routes.router, prefix="/api/robots", tags=["机器人"])
app.include_router(task_routes.router, prefix="/api/tasks", tags=["任务"])
app.include_router(log_routes.router, prefix="/api/logs", tags=["日志"])
app.include_router(stats_routes.router, prefix="/api/dashboard", tags=["统计"])

# 挂载 WebSocket 端点
app.include_router(websocket_router)


@app.get("/", tags=["根"])
async def root():
    """API 根路径"""
    return {
        "message": "RoboNexus API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", tags=["健康检查"])
async def health():
    """健康检查端点"""
    return {"status": "healthy"}
