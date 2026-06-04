# RoboNexus

机器人控制台站点。

线上地址：https://zhouyubo868-bot.github.io/robonexus/

## 页面结构

- `index.html` / `auth.html` — 统一认证入口（登录 / 注册 / 找回密码单页切换）
- `dashboard.html` — 登录后的控制台主页（机器人列表、统计卡片）

## 文件说明

| 文件 | 说明 |
|------|------|
| `index.html` | 认证入口（与 auth.html 相同） |
| `auth.html` | 统一认证页（登录/注册/找回密码/验证码） |
| `dashboard.html` | 控制台主页 |
| `builder.html` | 机器人组装实验室 |
| `styles.css` | 认证页共用样式 |
| `dashboard.css` | 控制台专用样式 |
| `auth.js` | 认证页交互逻辑（含邮箱验证、2FA 验证码流程） |
| `dashboard.js` | 控制台交互逻辑 |
| `tasks.js` | 任务调度面板 |
| `logs.js` | 日志查询抽屉 |
| `notifications.js` | 通知中心（顶栏铃铛） |
| `realtime.js` | 实时推送层（WebSocket，含 mock 模拟） |
| `api.js` | 统一 API 客户端（含 mock 模式、token 刷新） |
| `API.md` | 后端接口文档 |

## 已实现能力

- 统一认证：登录 / 注册 / 找回密码，单页切换
- 邮箱验证 + 双因素认证（2FA）：验证码步骤（mock 演示码 `123456`）
- Token 自动刷新：access token 过期时用 refreshToken 续期并重试
- 机器人组装实验室：真实元件库、属性评分、场景挑战
- 控制台：统计卡片、机器人列表（网格/列表视图切换）、详情弹窗
- 实时推送：机器人状态/电量/任务实时更新，告警
- 通知中心：顶栏铃铛红点、下拉面板、持久化
- 任务调度：新建/取消任务、实时进度推进
- 日志查询：按机器人/级别/关键词筛选

> mock 演示提示：登录时邮箱含 `2fa` 会触发双因素验证流程；注册后会进入邮箱验证步骤。验证码统一为 `123456`。

## 本地预览

直接双击 `index.html` 即可在浏览器打开，无需本地服务器。

## 接入真实后端

1. 编辑 `api.js`
2. 将 `USE_MOCK` 改为 `false`
3. 将 `BASE_URL` 改为真实后端地址
4. 确保后端按 `API.md` 实现接口

## 目录结构

```
robonexus/
├── index.html       # 认证入口
├── auth.html        # 统一认证页
├── dashboard.html   # 控制台主页
├── styles.css       # 认证页样式
├── dashboard.css    # 控制台样式
├── api.js           # API 客户端
├── auth.js          # 认证页逻辑
├── dashboard.js     # 控制台逻辑
├── API.md           # 后端接口文档
└── README.md        # 本文件
```
