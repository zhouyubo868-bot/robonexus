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

- [ ] 邮箱验证(注册后发验证邮件)
- [ ] 双因素认证(2FA)
- [ ] 刷新 token 机制
- [ ] WebSocket 实时推送(机器人状态变化、告警)
- [ ] 任务调度接口
- [ ] 日志查询接口
