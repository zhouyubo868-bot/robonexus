'use strict'

// ========== 日志查询抽屉 ==========
// 从右侧滑出,支持按机器人 / 级别 / 关键词筛选。点击侧边栏「监控」打开。

const LOG_LEVEL_META = {
  info: { label: '信息', color: '#5b8cff' },
  warn: { label: '警告', color: '#fbbf24' },
  error: { label: '错误', color: '#ef4444' },
}

const logDrawer = document.getElementById('log-drawer')
const logOverlay = document.getElementById('log-overlay')
const logList = document.getElementById('log-list')
const logFilterRobot = document.getElementById('log-filter-robot')
const logFilterLevel = document.getElementById('log-filter-level')
const logFilterKeyword = document.getElementById('log-filter-keyword')

let logsLoaded = false

function logTime(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function renderLogs(logs) {
  if (!logs.length) {
    logList.innerHTML = `<div class="log-empty">没有符合条件的日志</div>`
    return
  }
  logList.innerHTML = logs
    .map((l) => {
      const meta = LOG_LEVEL_META[l.level] || LOG_LEVEL_META.info
      return `
        <div class="log-entry">
          <span class="log-time">${logTime(l.time)}</span>
          <span class="log-level" style="color:${meta.color};border-color:${meta.color}55;">${meta.label}</span>
          <span class="log-robot">${l.robotName}</span>
          <span class="log-msg">${l.message}</span>
        </div>
      `
    })
    .join('')
}

async function queryLogs() {
  logList.innerHTML = `<div class="log-empty">加载中…</div>`
  try {
    const logs = await RoboAPI.getLogs({
      robotId: logFilterRobot.value,
      level: logFilterLevel.value,
      keyword: logFilterKeyword.value.trim(),
    })
    renderLogs(logs)
  } catch (err) {
    logList.innerHTML = `<div class="log-empty">查询失败: ${err.message}</div>`
  }
}

// 填充机器人筛选下拉(用 dashboard 的 currentRobots 或 mock 列表)
function populateRobotFilter() {
  const robots = (window.currentRobots && window.currentRobots.length) ? window.currentRobots : []
  const opts = ['<option value="">全部机器人</option>']
    .concat(robots.map((r) => `<option value="${r.id}">${r.name}</option>`))
  logFilterRobot.innerHTML = opts.join('')
}

function openDrawer() {
  populateRobotFilter()
  logOverlay.hidden = false
  logDrawer.hidden = false
  // 触发滑入动画
  requestAnimationFrame(() => logDrawer.classList.add('open'))
  if (!logsLoaded) {
    queryLogs()
    logsLoaded = true
  }
}

function closeDrawer() {
  logDrawer.classList.remove('open')
  logOverlay.hidden = true
  // 动画结束后隐藏
  setTimeout(() => { logDrawer.hidden = true }, 250)
}

// ---------- 事件 ----------
document.getElementById('nav-logs')?.addEventListener('click', (e) => {
  e.preventDefault()
  openDrawer()
})
document.getElementById('log-close')?.addEventListener('click', closeDrawer)
logOverlay?.addEventListener('click', closeDrawer)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !logDrawer.hidden) closeDrawer()
})

// 筛选变化即时查询;关键词输入做 300ms 防抖
logFilterRobot?.addEventListener('change', queryLogs)
logFilterLevel?.addEventListener('change', queryLogs)
let kwTimer
logFilterKeyword?.addEventListener('input', () => {
  clearTimeout(kwTimer)
  kwTimer = setTimeout(queryLogs, 300)
})
