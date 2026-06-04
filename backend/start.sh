#!/bin/bash
# RoboNexus 后端启动脚本

set -e

echo "=== RoboNexus Backend 启动 ==="

# 检查 venv
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

# 激活 venv
echo "激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "安装依赖..."
pip install -q -r requirements.txt

# 检查 .env
if [ ! -f ".env" ]; then
    echo "⚠️  .env 不存在，使用默认配置（请复制 .env.example 并修改 JWT_SECRET_KEY）"
fi

# 启动服务器
echo "启动 FastAPI 服务器..."
echo "API 文档: http://localhost:8000/docs"
echo "WebSocket: ws://localhost:8000/ws?token=YOUR_TOKEN"
echo ""
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
