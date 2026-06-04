# RoboNexus API 接口文档

后端 API 接口规范,供前后端对接使用。

## 基础信息

- **Base URL:** `https://api.robonexus.example.com` (待定)
- **协议:** HTTPS
- **认证方式:** JWT Bearer Token
- **Content-Type:** `application/json`

---

## 认证接口

### 1. 用户注册

**POST** `/api/auth/signup`

请求体:
```json
{
  "name": "张三",
  "email": "user@example.com",
  "password": "123456"
}
```

成功响应 (201):
```json
{
  "success": true,
  "data": {
    "userId": "usr_abc123",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_abc123",
      "name": "张三",
      "email": "user@example.com",
      "createdAt": "2026-06-03T12:00:00Z"
    }
  }
}
```

失败响应 (400):
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "该邮箱已被注册"
  }
}
```

---

### 2. 用户登录

**POST** `/api/auth/login`

请求体:
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

成功响应 (200):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_abc123",
      "name": "张三",
      "email": "user@example.com"
    }
  }
}
```

失败响应 (401):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "邮箱或密码错误"
  }
}
```

---

### 3. 找回密码

**POST** `/api/auth/forgot-password`

请求体:
```json
{
  "email": "user@example.com"
}
```

成功响应 (200):
```json
{
  "success": true,
  "message": "如果该邮箱已注册,重置链接已发送"
}
```

注意:无论邮箱是否存在,都返回相同响应(安全考虑)。

---

### 4. 重置密码

**POST** `/api/auth/reset-password`

请求体:
```json
{
  "token": "reset_token_from_email",
  "newPassword": "new_password_123"
}
```

成功响应 (200):
```json
{
  "success": true,
  "message": "密码已重置"
}
```

---

### 4.1 验证码校验(邮箱验证 / 2FA)

**POST** `/api/auth/verify-code`

注册后邮箱验证、或登录时的 2FA 二次校验都走此接口。

请求体:
```json
{
  "email": "user@example.com",
  "code": "123456",
  "pendingToken": "pending_xxx",
  "purpose": "email"
}
```

`purpose`: `email`(注册邮箱验证) / `2fa`(登录双因素验证)

成功响应 (200): 校验通过后下发正式 token,结构同登录。
```json
{
  "success": true,
  "data": {
    "token": "...",
    "refreshToken": "...",
    "user": { "id": "usr_abc123", "name": "张三", "email": "user@example.com" }
  }
}
```

失败响应 (400): `code` 为 `INVALID_CODE`,验证码错误或过期。

---

### 4.2 重发验证码

**POST** `/api/auth/resend-code`

请求体:
```json
{ "email": "user@example.com", "purpose": "email" }
```

成功响应 (200):
```json
{ "success": true, "message": "验证码已重新发送" }
```

---

### 4.3 刷新 Token

**POST** `/api/auth/refresh`

access token 过期(收到 401)时,前端自动用 refreshToken 换取新 token 并重试原请求。

请求体:
```json
{ "refreshToken": "..." }
```

成功响应 (200):
```json
{
  "success": true,
  "data": {
    "token": "新的 access token",
    "refreshToken": "新的 refresh token(可选,轮换)"
  }
}
```

刷新失败(refreshToken 也过期)时返回 401,前端清除登录态并跳转登录页。

> **登录响应变化**:`/api/auth/login` 现在可能返回 `{ requiresTwoFactor: true, pendingToken, email }`(账户开启 2FA 时),前端据此进入验证码步骤。`/api/auth/signup` 返回 `{ requiresEmailVerification: true, pendingToken, email }`,需邮箱验证后才激活。

---

## 机器人接口

### 5. 获取机器人列表

**GET** `/api/robots`

Headers:
```
Authorization: Bearer <token>
```

成功响应 (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "RB-001",
      "name": "Rover Alpha",
      "status": "online",
      "battery": 87,
      "tasks": 23,
      "lastSeen": "2026-06-03T12:00:00Z"
    }
  ]
}
```

---

### 6. 获取机器人详情

**GET** `/api/robots/:id`

Headers:
```
Authorization: Bearer <token>
```

成功响应 (200):
```json
{
  "success": true,
  "data": {
    "id": "RB-001",
    "name": "Rover Alpha",
    "status": "online",
    "battery": 87,
    "tasks": 23,
    "lastSeen": "2026-06-03T12:00:00Z",
    "model": "RX-2000",
    "firmware": "v2.1.3",
    "location": {
      "lat": 30.5728,
      "lng": 104.0668
    }
  }
}
```

---

### 7. 添加机器人

**POST** `/api/robots`

Headers:
```
Authorization: Bearer <token>
```

请求体:
```json
{
  "name": "New Robot",
  "model": "RX-2000",
  "serialNumber": "SN123456"
}
```

成功响应 (201):
```json
{
  "success": true,
  "data": {
    "id": "RB-009",
    "name": "New Robot",
    "status": "offline",
    "createdAt": "2026-06-03T12:00:00Z"
  }
}
```

---

### 8. 更新机器人

**PATCH** `/api/robots/:id`

Headers:
```
Authorization: Bearer <token>
```

请求体:
```json
{
  "name": "Updated Name"
}
```

成功响应 (200):
```json
{
  "success": true,
  "data": {
    "id": "RB-001",
    "name": "Updated Name",
    "updatedAt": "2026-06-03T12:00:00Z"
  }
}
```

---

### 9. 删除机器人

**DELETE** `/api/robots/:id`

Headers:
```
Authorization: Bearer <token>
```

成功响应 (200):
```json
{
  "success": true,
  "message": "机器人已删除"
}
```

---

---

## 任务调度接口

### 任务模型

```json
{
  "id": "TK-1001",
  "robotId": "RB-001",
  "robotName": "Rover Alpha",
  "type": "巡检",
  "status": "running",
  "progress": 62,
  "createdAt": "2026-06-03T12:00:00Z"
}
```

`status` 取值: `pending`(待执行) / `running`(执行中) / `done`(已完成) / `failed`(失败)

### T1. 获取任务列表

**GET** `/api/tasks`

成功响应 (200):
```json
{
  "success": true,
  "data": [ /* 任务对象数组,按 createdAt 倒序 */ ]
}
```

### T2. 创建任务

**POST** `/api/tasks`

请求体:
```json
{
  "robotId": "RB-001",
  "type": "巡检"
}
```

成功响应 (201): 返回新建的任务对象,初始 `status: "pending"`。

### T3. 取消/删除任务

**DELETE** `/api/tasks/:id`

成功响应 (200):
```json
{ "success": true, "message": "任务已取消" }
```

### T4. 任务进度推送 (WebSocket)

任务进度通过 WebSocket 推送:
```json
{ "type": "task:progress", "data": { "id": "TK-1001", "progress": 75, "status": "running" } }
```

---

---

## 日志接口

### L1. 查询日志

**GET** `/api/logs`

查询参数(全部可选):

| 参数 | 说明 |
|------|------|
| `robotId` | 按机器人筛选 |
| `level` | 按级别筛选: `info` / `warn` / `error` |
| `keyword` | 按消息关键词模糊匹配 |
| `limit` | 返回条数上限,默认 100 |

成功响应 (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "LOG-10001",
      "robotId": "RB-001",
      "robotName": "Rover Alpha",
      "level": "error",
      "message": "电机过载停机",
      "time": "2026-06-03T12:00:00Z"
    }
  ]
}
```

`level` 取值: `info`(信息) / `warn`(警告) / `error`(错误)

---

## 统计接口

### 10. 获取仪表盘统计

**GET** `/api/dashboard/stats`

Headers:
```
Authorization: Bearer <token>
```

成功响应 (200):
```json
{
  "success": true,
  "data": {
    "totalRobots": 8,
    "onlineRobots": 6,
    "alerts": 2,
    "tasksExecuted": 142
  }
}
```

---

## OAuth 接口

### 11. Google OAuth

**GET** `/api/auth/oauth/google`

重定向到 Google OAuth 授权页面。

回调: **GET** `/api/auth/oauth/google/callback?code=<code>`

成功后前端接收 token 并跳转到控制台。

### 12. GitHub OAuth

**GET** `/api/auth/oauth/github`

重定向到 GitHub OAuth 授权页面。

回调: **GET** `/api/auth/oauth/github/callback?code=<code>`

### 13. 微信 OAuth

**GET** `/api/auth/oauth/wechat`

重定向到微信 OAuth 授权页面。

回调: **GET** `/api/auth/oauth/wechat/callback?code=<code>`

---

## 错误码

| 错误码 | HTTP | 说明 |
|--------|------|------|
| `EMAIL_EXISTS` | 400 | 邮箱已被注册 |
| `INVALID_CREDENTIALS` | 401 | 邮箱或密码错误 |
| `UNAUTHORIZED` | 401 | 未登录或 token 无效 |
| `FORBIDDEN` | 403 | 无权限访问 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 前端对接要点

1. **token 存储**: 登录/注册成功后,将 token 存入 `localStorage`
2. **请求拦截**: 所有需要认证的请求在 headers 添加 `Authorization: Bearer <token>`
3. **401 处理**: 收到 401 响应时清除 token 并跳转到登录页
4. **密码安全**: 
   - 前端只做基础校验(长度、格式)
   - 实际密码传输走 HTTPS
   - 后端做 bcrypt/argon2 哈希存储
5. **OAuth 流程**: 
   - 点击第三方登录按钮 → 打开新窗口跳转到 `/api/auth/oauth/<provider>`
   - 回调后接收 token → 存储并关闭窗口 → 刷新主窗口

---

## 待实现功能

- [x] 邮箱验证(注册后发验证邮件)
- [x] 双因素认证(2FA)
- [x] 刷新 token 机制
- [x] WebSocket 实时推送(机器人状态变化、告警)
- [x] 任务调度接口
- [x] 日志查询接口
- [ ] OAuth 第三方登录后端对接(Google / GitHub / 微信)
