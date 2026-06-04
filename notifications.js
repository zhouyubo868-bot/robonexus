'use strict'

// ========== 通知中心 ==========
// 管理告警/通知列表,渲染顶栏铃铛下拉面板。
// 通知来源:realtime.js 的 'alert' 事件 → RoboNotify.push()
// 持久化到 localStorage,刷新后保留(最多保留 50 条)

const STORAGE_KEY = 'rn_notifications'
const MAX_ITEMS = 50

const LEVEL_META = {
  critical: { label: '严重', color: '#ef4444', icon: '⛔' },
  warning: { label: '警告', color: '#fbbf24', icon: '⚠️' },
  info: { label: '信息', color: '#5b8cff', icon: 'ℹ️' },
}

let items = load()
let panelOpen = false

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
}

function unreadCount() {
  return items.filter((n) => !n.read).length
}

// ---------- DOM ----------
let bellBtn, badgeEl, panelEl

function ensureDOM() {
  bellBtn = document.getElementById('notifications-btn')
  if (!bellBtn) return false

  // 红点徽标
  badgeEl = document.getElementById('notif-badge')
  if (!badgeEl) {
    bellBtn.style.position = 'relative'
    badgeEl = document.createElement('span')
    badgeEl.id = 'notif-badge'
    badgeEl.className = 'notif-badge'
    badgeEl.hidden = true
    bellBtn.appendChild(badgeEl)
  }

  // 下拉面板
  panelEl = document.getElementById('notif-panel')
  if (!panelEl) {
    panelEl = document.createElement('div')
    panelEl.id = 'notif-panel'
    panelEl.className = 'notif-panel'
    panelEl.hidden = true
    document.body.appendChild(panelEl)
  }
  return true
}

function renderBadge() {
  if (!badgeEl) return
  const n = unreadCount()
  if (n > 0) {
    badgeEl.textContent = n > 99 ? '99+' : n
    badgeEl.hidden = false
  } else {
    badgeEl.hidden = true
  }
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${Math.floor(diff / 86400)}天前`
}

function renderPanel() {
  if (!panelEl) return
  const header = `
    <div class="notif-head">
      <span class="notif-title">通知 ${unreadCount() ? `(${unreadCount()})` : ''}</span>
      <div class="notif-head-actions">
        <button class="notif-link" data-action="read-all">全部已读</button>
        <button class="notif-link" data-action="clear">清空</button>
      </div>
    </div>
  `

  const body = items.length
    ? `<div class="notif-list">${items.map(itemHTML).join('')}</div>`
    : `<div class="notif-empty">
         <div style="font-size:40px;opacity:.5;margin-bottom:8px;">🔔</div>
         <div>暂无通知</div>
       </div>`

  panelEl.innerHTML = header + body
}

function itemHTML(n) {
  const meta = LEVEL_META[n.level] || LEVEL_META.info
  return `
    <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
      <div class="notif-dot" style="background:${meta.color}"></div>
      <div class="notif-content">
        <div class="notif-msg">
          <span class="notif-level" style="color:${meta.color}">${meta.icon} ${meta.label}</span>
          ${n.robotName ? `· ${n.robotName}` : ''}
        </div>
        <div class="notif-text">${n.message}</div>
        <div class="notif-time">${timeAgo(n.time)}</div>
      </div>
    </div>
  `
}

// ---------- 交互 ----------
function togglePanel() {
  panelOpen = !panelOpen
  panelEl.hidden = !panelOpen
  if (panelOpen) {
    positionPanel()
    renderPanel()
  }
}

function closePanel() {
  panelOpen = false
  if (panelEl) panelEl.hidden = true
}

function positionPanel() {
  const r = bellBtn.getBoundingClientRect()
  panelEl.style.top = `${r.bottom + 8}px`
  panelEl.style.right = `${window.innerWidth - r.right}px`
}

function bindEvents() {
  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    togglePanel()
  })

  // 面板内操作(事件委托)
  panelEl.addEventListener('click', (e) => {
    e.stopPropagation()
    const action = e.target.dataset.action
    if (action === 'read-all') {
      items.forEach((n) => (n.read = true))
      persist()
      renderBadge()
      renderPanel()
    } else if (action === 'clear') {
      items = []
      persist()
      renderBadge()
      renderPanel()
    }
    // 点单条 → 标记已读
    const itemEl = e.target.closest('.notif-item')
    if (itemEl) {
      const n = items.find((x) => x.id === itemEl.dataset.id)
      if (n && !n.read) {
        n.read = true
        persist()
        renderBadge()
        renderPanel()
      }
    }
  })

  // 点击外部关闭
  document.addEventListener('click', () => {
    if (panelOpen) closePanel()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel()
  })
}

// ---------- 对外接口 ----------
function push(alert) {
  const notif = {
    id: alert.id || 'alt_' + Date.now(),
    level: alert.level || 'info',
    message: alert.message || '',
    robotId: alert.robotId,
    robotName: alert.robotName,
    time: alert.time || new Date().toISOString(),
    read: false,
  }
  items.unshift(notif)
  items = items.slice(0, MAX_ITEMS)
  persist()
  renderBadge()
  if (panelOpen) renderPanel()
  // 铃铛抖动一下
  if (bellBtn) {
    bellBtn.classList.remove('bell-shake')
    void bellBtn.offsetWidth
    bellBtn.classList.add('bell-shake')
  }
}

function init() {
  if (!ensureDOM()) return
  bindEvents()
  renderBadge()
}

// DOM 就绪后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

window.RoboNotify = { push, unreadCount, init }
