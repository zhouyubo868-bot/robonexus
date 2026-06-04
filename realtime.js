'use strict'

// ========== 实时推送层 ==========
// 封装机器人状态、电量、任务、告警的实时推送,详见 API.md「WebSocket 实时推送」。
//
// USE_MOCK = true  时,用本地定时器模拟后端推送(GitHub Pages 静态演示)
// 接好真实后端后,把 USE_MOCK 改为 false,并填上 WS_URL
//
// 事件协议(与后端一致):
//   { type: 'robot:status', data: { id, status } }
//   { type: 'robot:battery', data: { id, battery } }
//   { type: 'robot:task',   data: { id, tasks } }
//   { type: 'alert',        data: { id, robotId, level, message, time } }
//   { type: 'stats',        data: { totalRobots, onlineRobots, alerts, tasksExecuted } }

const RT_USE_MOCK = true
const WS_URL = 'wss://api.robonexus.example.com/ws' // TODO: 替换为真实 WS 地址

// ---------- 事件分发器 ----------
const listeners = {} // { type: Set<fn> }

function on(type, fn) {
  ;(listeners[type] || (listeners[type] = new Set())).add(fn)
  return () => off(type, fn) // 返回取消订阅函数
}

function off(type, fn) {
  listeners[type]?.delete(fn)
}

function dispatch(type, data) {
  listeners[type]?.forEach((fn) => {
    try {
      fn(data)
    } catch (err) {
      console.error(`[realtime] ${type} 监听器出错:`, err)
    }
  })
  // 通配监听:on('*') 可拿到所有事件
  listeners['*']?.forEach((fn) => {
    try {
      fn({ type, data })
    } catch (err) {
      console.error('[realtime] * 监听器出错:', err)
    }
  })
}

// ---------- 连接状态 ----------
let connected = false
let ws = null
let mockTimer = null
let seededRobots = [] // mock 用:基于当前展示的机器人生成可信事件
let runningTasks = [] // mock 用:推进中的任务 { id, progress, status }

// 把当前展示的机器人喂给实时层(mock 据此生成事件)
function seed(robots) {
  seededRobots = (robots || []).map((r) => ({
    id: r.id,
    status: r.status || 'offline',
    battery: typeof r.battery === 'number' ? r.battery : 100,
    tasks: typeof r.tasks === 'number' ? r.tasks : 0,
    name: r.name,
  }))
}

// 把执行中/待执行的任务喂给实时层(mock 据此推进进度)
function seedTasks(tasks) {
  runningTasks = (tasks || [])
    .filter((t) => t.status === 'running' || t.status === 'pending')
    .map((t) => ({ id: t.id, progress: t.progress || 0, status: t.status }))
}

// ---------- 真实 WebSocket ----------
function connectReal() {
  const token = localStorage.getItem('rn_token')
  ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token || '')}`)

  ws.addEventListener('open', () => {
    connected = true
    dispatch('open', null)
  })
  ws.addEventListener('message', (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg && msg.type) dispatch(msg.type, msg.data)
    } catch (err) {
      console.error('[realtime] 消息解析失败:', err)
    }
  })
  ws.addEventListener('close', () => {
    connected = false
    dispatch('close', null)
    // 断线重连(5s 后)
    setTimeout(() => {
      if (!connected) connectReal()
    }, 5000)
  })
  ws.addEventListener('error', (err) => {
    console.error('[realtime] WebSocket 错误:', err)
    dispatch('error', err)
  })
}

// ---------- Mock 模拟推送 ----------
const STATUSES = ['online', 'offline', 'error']
const ALERT_TEMPLATES = [
  { level: 'critical', message: '电量过低,即将停机' },
  { level: 'critical', message: '检测到电机故障' },
  { level: 'warning', message: '温度偏高' },
  { level: 'warning', message: '信号弱,通信不稳定' },
  { level: 'info', message: '固件有可用更新' },
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

function emitStats() {
  if (!seededRobots.length) return
  const online = seededRobots.filter((r) => r.status === 'online').length
  const alerts = seededRobots.filter((r) => r.status === 'error').length
  const tasks = seededRobots.reduce((sum, r) => sum + r.tasks, 0)
  dispatch('stats', {
    totalRobots: seededRobots.length,
    onlineRobots: online,
    alerts,
    tasksExecuted: tasks,
  })
}

// 每次 tick 随机挑一台机器人,产生一种可信的变化
function mockTick() {
  advanceTasks()
  if (!seededRobots.length) return
  const robot = pick(seededRobots)
  const roll = Math.random()

  if (roll < 0.45) {
    // 任务计数 +1(最常见)
    robot.tasks += 1
    dispatch('robot:task', { id: robot.id, tasks: robot.tasks })
    emitStats()
  } else if (roll < 0.75) {
    // 电量波动:在线掉电,离线缓慢回升(模拟充电)
    const delta = robot.status === 'online' ? -(1 + Math.floor(Math.random() * 3)) : 1
    robot.battery = Math.max(0, Math.min(100, robot.battery + delta))
    dispatch('robot:battery', { id: robot.id, battery: robot.battery })
    // 低电量自动告警
    if (robot.battery <= 15 && robot.status !== 'error') {
      pushAlert(robot, { level: 'critical', message: `电量仅剩 ${robot.battery}%` })
    }
  } else if (roll < 0.92) {
    // 状态切换
    const next = pick(STATUSES.filter((s) => s !== robot.status))
    robot.status = next
    dispatch('robot:status', { id: robot.id, status: next })
    if (next === 'error') pushAlert(robot, pick(ALERT_TEMPLATES))
    emitStats()
  } else {
    // 随机告警
    pushAlert(robot, pick(ALERT_TEMPLATES))
  }
}

function pushAlert(robot, tpl) {
  dispatch('alert', {
    id: 'alt_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    robotId: robot.id,
    robotName: robot.name,
    level: tpl.level,
    message: tpl.message,
    time: new Date().toISOString(),
  })
}

// 推进 mock 任务进度:每次 tick 让 pending→running、running 进度增长直至 done(偶尔 failed)
function advanceTasks() {
  runningTasks.forEach((t) => {
    if (t.status === 'pending') {
      t.status = 'running'
      dispatch('task:progress', { id: t.id, progress: t.progress, status: 'running' })
      return
    }
    if (t.status === 'running') {
      t.progress = Math.min(100, t.progress + 8 + Math.floor(Math.random() * 14))
      if (t.progress >= 100) {
        // 90% 完成,10% 失败
        t.status = Math.random() < 0.9 ? 'done' : 'failed'
        t.progress = t.status === 'done' ? 100 : t.progress
      }
      dispatch('task:progress', { id: t.id, progress: t.progress, status: t.status })
    }
  })
  // 清掉已结束的任务
  runningTasks = runningTasks.filter((t) => t.status === 'running' || t.status === 'pending')
}

function connectMock() {
  connected = true
  dispatch('open', null)
  // 1.8~3.5s 不规则间隔,避免太机械
  const schedule = () => {
    mockTimer = setTimeout(() => {
      mockTick()
      schedule()
    }, 1800 + Math.random() * 1700)
  }
  schedule()
}

// ---------- 对外接口 ----------
function connect() {
  if (connected) return
  if (RT_USE_MOCK) connectMock()
  else connectReal()
}

function disconnect() {
  connected = false
  if (mockTimer) {
    clearTimeout(mockTimer)
    mockTimer = null
  }
  if (ws) {
    ws.close()
    ws = null
  }
}

window.RoboRealtime = { connect, disconnect, on, off, seed, seedTasks, isConnected: () => connected }
