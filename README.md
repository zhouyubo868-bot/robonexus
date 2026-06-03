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
| `auth.html` | 统一认证页（登录/注册/找回密码） |
| `dashboard.html` | 控制台主页 |
| `styles.css` | 认证页共用样式 |
| `dashboard.css` | 控制台专用样式 |
| `auth.js` | 认证页交互逻辑 |
| `dashboard.js` | 控制台交互逻辑 |
| `api.js` | 统一 API 客户端（含 mock 模式） |
| `API.md` | 后端接口文档 |

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
