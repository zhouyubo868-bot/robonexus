'use strict'

// ========== API 客户端 ==========
// 统一封装后端接口调用,详见 API.md
//
// 当 USE_MOCK = true 时,使用本地模拟数据(适合 GitHub Pages 静态托管演示)
// 接好真实后端后,把 USE_MOCK 改为 false,并填上 BASE_URL

const USE_MOCK = true
const BASE_URL = 'https://api.robonexus.example.com' // TODO: 替换为真实后端地址

// ---------- 通用请求封装 ----------
function getToken() {
  return localStorage.getItem('rn_token')
}

function getRefreshToken() {
  return localStorage.getItem('rn_refresh_token')
}

// 用 refreshToken 换新的 access token,详见 API.md「刷新 token」
let refreshing = null // 并发请求共享同一次刷新
async function refreshAccessToken() {
  const rt = getRefreshToken()
  if (!rt) return false
  if (refreshing) return refreshing // 已有刷新在进行,复用

  refreshing = (async () => {
    try {
      if (USE_MOCK) {
        await delay(300)
        localStorage.setItem('rn_token', 'mock_token_' + Date.now())
        return true
      }
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body.success === false || !(body.data?.token || body.token)) return false
      localStorage.setItem('rn_token', body.data?.token || body.token)
      const newRt = body.data?.refreshToken || body.refreshToken
      if (newRt) localStorage.setItem('rn_refresh_token', newRt)
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

function forceLogout() {
  localStorage.removeItem('rn_token')
  localStorage.removeItem('rn_refresh_token')
  localStorage.removeItem('rn_logged_in')
  if (!location.pathname.endsWith('auth.html') && !location.pathname.endsWith('index.html')) {
    location.href = 'auth.html'
  }
}

async function request(path, options = {}, _retried = false) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  // 401:先尝试用 refreshToken 续期并重试一次,失败才登出
  if (res.status === 401) {
    if (!_retried && (await refreshAccessToken())) {
      return request(path, options, true)
    }
    forceLogout()
    throw new Error('未登录或登录已过期')
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.success === false) {
    const msg = body?.error?.message || `请求失败 (${res.status})`
    throw new Error(msg)
  }
  return body.data ?? body
}

// ---------- 模拟数据 ----------
const MOCK_ROBOTS = [
  { id: 'RB-001', name: 'Rover Alpha', status: 'online', battery: 87, tasks: 23, lastSeen: '2分钟前' },
  { id: 'RB-002', name: 'Scout Beta', status: 'online', battery: 92, tasks: 15, lastSeen: '刚刚' },
  { id: 'RB-003', name: 'Guard Gamma', status: 'online', battery: 76, tasks: 31, lastSeen: '5分钟前' },
  { id: 'RB-004', name: 'Explorer Delta', status: 'offline', battery: 43, tasks: 8, lastSeen: '2小时前' },
  { id: 'RB-005', name: 'Sentinel Epsilon', status: 'online', battery: 95, tasks: 19, lastSeen: '1分钟前' },
  { id: 'RB-006', name: 'Worker Zeta', status: 'error', battery: 12, tasks: 0, lastSeen: '30分钟前' },
  { id: 'RB-007', name: 'Patrol Eta', status: 'online', battery: 81, tasks: 27, lastSeen: '3分钟前' },
  { id: 'RB-008', name: 'Rescue Theta', status: 'online', battery: 68, tasks: 12, lastSeen: '8分钟前' },
]

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- 模拟任务数据 ----------
const TASK_TYPES = ['巡检', '搬运', '清扫', '数据采集', '充电', '远程升级']
const TASK_STATUS = ['pending', 'running', 'done', 'failed']

let MOCK_TASKS = [
  { id: 'TK-1001', robotId: 'RB-001', robotName: 'Rover Alpha', type: '巡检', status: 'running', progress: 62, createdAt: new Date(Date.now() - 18 * 60000).toISOString() },
  { id: 'TK-1002', robotId: 'RB-003', robotName: 'Guard Gamma', type: '数据采集', status: 'done', progress: 100, createdAt: new Date(Date.now() - 95 * 60000).toISOString() },
  { id: 'TK-1003', robotId: 'RB-006', robotName: 'Worker Zeta', type: '搬运', status: 'failed', progress: 34, createdAt: new Date(Date.now() - 40 * 60000).toISOString() },
  { id: 'TK-1004', robotId: 'RB-002', robotName: 'Scout Beta', type: '清扫', status: 'pending', progress: 0, createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
]
let taskSeq = 1005

// ---------- 模拟日志数据 ----------
const LOG_LEVELS = ['info', 'warn', 'error']
const LOG_MESSAGES = {
  info: ['任务开始执行', '已连接到控制中心', '电池充电完成', '固件校验通过', '导航路径已规划', '传感器自检正常'],
  warn: ['电量低于 20%', '通信延迟偏高', '检测到障碍物,绕行', '温度接近上限', '定位信号弱'],
  error: ['电机过载停机', '通信中断', '导航失败,无法到达目标', '传感器读数异常', '任务执行超时'],
}

function genMockLogs(count) {
  const robots = MOCK_ROBOTS
  const logs = []
  for (let i = 0; i < count; i++) {
    const robot = robots[Math.floor(Math.random() * robots.length)]
    const level = LOG_LEVELS[Math.floor(Math.random() * LOG_LEVELS.length)]
    const msgs = LOG_MESSAGES[level]
    logs.push({
      id: 'LOG-' + (10000 + i),
      robotId: robot.id,
      robotName: robot.name,
      level,
      message: msgs[Math.floor(Math.random() * msgs.length)],
      time: new Date(Date.now() - Math.floor(Math.random() * 24 * 3600 * 1000)).toISOString(),
    })
  }
  return logs.sort((a, b) => new Date(b.time) - new Date(a.time))
}

const MOCK_LOGS = genMockLogs(60)

// ========== 对外 API ==========
const api = {
  // ---- 认证 ----
  async login(email, password) {
    if (USE_MOCK) {
      await delay(800)
      const name = email.split('@')[0]
      // 模拟:邮箱含 "2fa" 的账户开启了双因素认证,需要二次验证码
      if (/2fa/i.test(email)) {
        return { requiresTwoFactor: true, pendingToken: 'pending_' + Date.now(), email, name }
      }
      const token = 'mock_token_' + Date.now()
      return { token, refreshToken: 'mock_refresh_' + Date.now(), user: { id: 'usr_mock', name, email } }
    }
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  // 2FA / 邮箱验证码校验(mock 下固定 123456)
  async verifyCode({ email, code, pendingToken, purpose }) {
    if (USE_MOCK) {
      await delay(600)
      if (code !== '123456') {
        throw new Error('验证码错误,请重新输入(演示验证码:123456)')
      }
      const name = (email || '').split('@')[0] || 'user'
      const token = 'mock_token_' + Date.now()
      return { token, refreshToken: 'mock_refresh_' + Date.now(), user: { id: 'usr_mock', name, email } }
    }
    return request('/api/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code, pendingToken, purpose }),
    })
  },

  // 重发验证码
  async resendCode({ email, purpose }) {
    if (USE_MOCK) {
      await delay(500)
      return { message: '验证码已重新发送' }
    }
    return request('/api/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email, purpose }),
    })
  },

  async signup(name, email, password) {
    if (USE_MOCK) {
      await delay(800)
      // 注册后进入邮箱验证步骤(不直接发 token)
      return { requiresEmailVerification: true, pendingToken: 'pending_' + Date.now(), email, name }
    }
    return request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
  },

  async forgotPassword(email) {
    if (USE_MOCK) {
      await delay(800)
      return { message: '如果该邮箱已注册,重置链接已发送' }
    }
    return request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  // ---- 机器人 ----
  async getRobots() {
    if (USE_MOCK) {
      await delay(400)
      return MOCK_ROBOTS
    }
    return request('/api/robots')
  },

  async getRobot(id) {
    if (USE_MOCK) {
      await delay(300)
      return MOCK_ROBOTS.find((r) => r.id === id) || null
    }
    return request(`/api/robots/${id}`)
  },

  async addRobot(payload) {
    if (USE_MOCK) {
      await delay(500)
      return { id: 'RB-' + String(MOCK_ROBOTS.length + 1).padStart(3, '0'), ...payload, status: 'offline' }
    }
    return request('/api/robots', { method: 'POST', body: JSON.stringify(payload) })
  },

  // ---- 任务调度 ----
  async getTasks() {
    if (USE_MOCK) {
      await delay(350)
      return [...MOCK_TASKS].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
    return request('/api/tasks')
  },

  async createTask({ robotId, robotName, type }) {
    if (USE_MOCK) {
      await delay(400)
      const task = {
        id: 'TK-' + taskSeq++,
        robotId,
        robotName,
        type,
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString(),
      }
      MOCK_TASKS.unshift(task)
      return task
    }
    return request('/api/tasks', { method: 'POST', body: JSON.stringify({ robotId, type }) })
  },

  async cancelTask(id) {
    if (USE_MOCK) {
      await delay(300)
      MOCK_TASKS = MOCK_TASKS.filter((t) => t.id !== id)
      return { message: '任务已取消' }
    }
    return request(`/api/tasks/${id}`, { method: 'DELETE' })
  },

  // ---- 日志 ----
  async getLogs({ robotId = '', level = '', keyword = '', limit = 100 } = {}) {
    if (USE_MOCK) {
      await delay(300)
      let result = MOCK_LOGS
      if (robotId) result = result.filter((l) => l.robotId === robotId)
      if (level) result = result.filter((l) => l.level === level)
      if (keyword) result = result.filter((l) => l.message.includes(keyword))
      return result.slice(0, limit)
    }
    const params = new URLSearchParams()
    if (robotId) params.set('robotId', robotId)
    if (level) params.set('level', level)
    if (keyword) params.set('keyword', keyword)
    params.set('limit', limit)
    return request(`/api/logs?${params.toString()}`)
  },

  // ---- 统计 ----
  async getStats() {
    if (USE_MOCK) {
      await delay(300)
      const online = MOCK_ROBOTS.filter((r) => r.status === 'online').length
      const alerts = MOCK_ROBOTS.filter((r) => r.status === 'error').length
      const tasks = MOCK_ROBOTS.reduce((sum, r) => sum + r.tasks, 0)
      return { totalRobots: MOCK_ROBOTS.length, onlineRobots: online, alerts, tasksExecuted: tasks }
    }
    return request('/api/dashboard/stats')
  },
}

// 保存登录态的辅助函数
function saveSession({ token, refreshToken, user }) {
  if (token) localStorage.setItem('rn_token', token)
  if (refreshToken) localStorage.setItem('rn_refresh_token', refreshToken)
  localStorage.setItem('rn_logged_in', 'true')
  if (user) {
    localStorage.setItem('rn_user_email', user.email)
    localStorage.setItem('rn_user_name', user.name)
  }
}

function clearSession() {
  localStorage.removeItem('rn_token')
  localStorage.removeItem('rn_refresh_token')
  localStorage.removeItem('rn_logged_in')
  localStorage.removeItem('rn_user_email')
  localStorage.removeItem('rn_user_name')
}

window.RoboAPI = api
window.RoboSession = { save: saveSession, clear: clearSession }
