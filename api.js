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

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  // 401 统一处理:清除登录态并跳转登录页
  if (res.status === 401) {
    localStorage.removeItem('rn_token')
    localStorage.removeItem('rn_logged_in')
    if (!location.pathname.endsWith('auth.html') && !location.pathname.endsWith('index.html')) {
      location.href = 'auth.html'
    }
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

// ========== 对外 API ==========
const api = {
  // ---- 认证 ----
  async login(email, password) {
    if (USE_MOCK) {
      await delay(800)
      // 模拟:任意邮箱+6位以上密码即登录成功
      const name = email.split('@')[0]
      const token = 'mock_token_' + Date.now()
      return { token, user: { id: 'usr_mock', name, email } }
    }
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  async signup(name, email, password) {
    if (USE_MOCK) {
      await delay(800)
      const token = 'mock_token_' + Date.now()
      return { userId: 'usr_mock', token, user: { id: 'usr_mock', name, email } }
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
function saveSession({ token, user }) {
  if (token) localStorage.setItem('rn_token', token)
  localStorage.setItem('rn_logged_in', 'true')
  if (user) {
    localStorage.setItem('rn_user_email', user.email)
    localStorage.setItem('rn_user_name', user.name)
  }
}

function clearSession() {
  localStorage.removeItem('rn_token')
  localStorage.removeItem('rn_logged_in')
  localStorage.removeItem('rn_user_email')
  localStorage.removeItem('rn_user_name')
}

window.RoboAPI = api
window.RoboSession = { save: saveSession, clear: clearSession }
