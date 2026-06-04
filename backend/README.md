# RoboNexus Backend

FastAPI + SQLite 后端实现，支持机器人状态管理、任务调度、实时推送和用户认证。

## 技术栈

- **FastAPI** 0.104.1 - 现代化异步 Web 框架
- **SQLAlchemy** 2.0.23 + **aiosqlite** - 异步 ORM 与 SQLite 数据库
- **Pydantic** 2.5.0 - 数据验证和序列化
- **python-jose** - JWT token 签发与验证
- **passlib** - 密码加密（bcrypt）
- **WebSockets** 12.0 - 实时推送支持

## 快速开始

### 1. 进入后端目录

```bash
cd backend
```

### 2. 创建虚拟环境

```bash
python3 -m venv venv
```

### 3. 激活虚拟环境

**macOS / Linux:**
```bash
source venv/bin/activate
```

**Windows:**
```cmd
venv\Scripts\activate
```

### 4. 安装依赖

```bash
pip install -r requirements.txt
```

### 5. 启动服务

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

服务启动后访问：
- **API 文档**: http://localhost:8000/docs (Swagger UI)
- **API 根路径**: http://localhost:8000/

## 连接前端

修改前端配置文件，将 mock 模式切换为真实后端：

### 修改 `api.js`

```javascript
const USE_MOCK = false  // 关闭 mock 模式
const BASE_URL = 'http://localhost:8000'  // 指向后端地址
```

### 修改 `realtime.js`

```javascript
const RT_USE_MOCK = false  // 关闭 mock 模式
const WS_URL = 'ws://localhost:8000/ws'  // 指向 WebSocket 地址
```

## API 端点概览

### 认证模块 `/api/auth`
- `POST /login` - 用户登录（支持双因素认证）
- `POST /signup` - 用户注册（需邮箱验证）
- `POST /verify-code` - 验证邮箱验证码或 2FA 代码
- `POST /resend-code` - 重发验证码
- `POST /refresh` - 刷新 access token

### 机器人管理 `/api/robots`
- `GET /api/robots` - 获取机器人列表
- `GET /api/robots/{id}` - 获取单个机器人详情
- `POST /api/robots` - 添加新机器人
- `PUT /api/robots/{id}` - 更新机器人信息
- `DELETE /api/robots/{id}` - 删除机器人

### 任务调度 `/api/tasks`
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建新任务
- `GET /api/tasks/{id}` - 获取任务详情
- `DELETE /api/tasks/{id}` - 取消任务

### 日志查询 `/api/logs`
- `GET /api/logs` - 查询日志（支持按机器人、级别、关键词过滤）

### 统计数据 `/api/dashboard`
- `GET /api/dashboard/stats` - 获取仪表盘统计数据

### 实时推送 `/ws`
- WebSocket 连接，推送机器人状态、电量、任务进度、告警等实时事件

## 测试账户说明

### 注册流程
1. 注册新用户后，系统会要求输入邮箱验证码
2. **演示验证码**: `123456`（固定值，用于测试）
3. 验证通过后即可登录

### 双因素认证（2FA）
- 当登录的邮箱地址包含 `2fa` 字样时，会触发双因素验证
- 例如：`user2fa@example.com`
- **验证码**: `123456`（固定值，用于测试）

### 示例账户
```
邮箱: test@example.com
密码: password123
（普通登录，需邮箱验证）

邮箱: admin2fa@example.com
密码: admin123
（触发 2FA 验证）
```

## 项目结构

```
backend/
├── main.py              # FastAPI 应用入口
├── database.py          # SQLAlchemy 数据库配置
├── models.py            # 数据库模型定义
├── schemas.py           # Pydantic 数据验证模型
├── auth.py              # JWT 认证工具函数
├── websocket.py         # WebSocket 连接管理
├── requirements.txt     # Python 依赖清单
├── routes/              # API 路由模块
│   ├── auth_routes.py   # 认证相关接口
│   ├── robot_routes.py  # 机器人管理接口
│   ├── task_routes.py   # 任务调度接口
│   ├── log_routes.py    # 日志查询接口
│   └── stats_routes.py  # 统计数据接口
└── services/            # 业务逻辑层（可扩展）
```

## 开发说明

### 数据库

首次启动时，SQLite 数据库文件会自动创建在 `backend/robonexus.db`。所有表结构由 SQLAlchemy 自动初始化。

### CORS 配置

`main.py` 中已配置允许以下前端地址跨域访问：
- `http://localhost:3000`
- `http://localhost:5173`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:5173`

如需添加其他域名，修改 `CORSMiddleware` 的 `allow_origins` 参数。

### 环境变量（可选）

如需自定义配置，可创建 `.env` 文件：
```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./robonexus.db
```

## 常见问题

**Q: 启动时提示端口被占用？**  
A: 修改启动命令中的端口号，例如 `--port 8001`

**Q: 前端连接不上 WebSocket？**  
A: 确认防火墙未拦截端口，且 `realtime.js` 中 `WS_URL` 地址正确

**Q: 验证码输入错误怎么办？**  
A: 当前版本验证码固定为 `123456`，如需动态发送可集成邮件服务（如 SendGrid、阿里云邮件推送）

## 下一步

- [ ] 集成真实邮件服务（替换固定验证码）
- [ ] 添加机器人遥测数据持久化
- [ ] 实现任务执行历史记录
- [ ] 支持机器人分组和权限管理
- [ ] 部署到生产环境（Docker / 云服务）
