'use strict'

// 登录守卫：未登录直接跳回认证页(放最前,避免内容闪现)
if (!localStorage.getItem('rn_logged_in')) {
  window.location.href = 'auth.html'
}

// DOM 引用
const robotsContainer = document.getElementById('robots-container')
const addRobotBtn = document.getElementById('add-robot-btn')
const userBtn = document.getElementById('user-btn')

// 状态文案映射
const STATUS_TEXT = { online: '在线', offline: '离线', error: '故障' }

// 渲染机器人卡片
function renderRobots(robots) {
  robotsContainer.innerHTML = robots
    .map(
      (robot) => `
    <div class="robot-card" data-id="${robot.id}">
      <div class="robot-header">
        <div class="robot-info">
          <h3>${robot.name}</h3>
          <div class="robot-id">${robot.id}</div>
        </div>
        <div class="robot-status ${robot.status}">
          <span class="status-dot"></span>
          <span>${STATUS_TEXT[robot.status] || robot.status}</span>
        </div>
      </div>
      <div class="robot-meta">
        <div class="meta-row">
          <span class="meta-label">电量</span>
          <span class="meta-value">${robot.battery}%</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">任务数</span>
          <span class="meta-value">${robot.tasks}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">最后上线</span>
          <span class="meta-value">${robot.lastSeen}</span>
        </div>
      </div>
    </div>
  `
    )
    .join('')

  // 点击卡片查看详情
  document.querySelectorAll('.robot-card').forEach((card) => {
    card.addEventListener('click', () => {
      const robotId = card.dataset.id
      // TODO: 打开机器人详情页/模态框
      alert(`机器人详情功能开发中\nID: ${robotId}`)
    })
  })
}

// 填充统计卡片
function renderStats(stats) {
  const set = (id, val) => {
    const el = document.getElementById(id)
    if (el) el.textContent = val
  }
  set('stat-total', stats.totalRobots)
  set('stat-online', stats.onlineRobots)
  set('stat-alerts', stats.alerts)
  set('stat-tasks', stats.tasksExecuted)
}

// 加载数据
async function loadDashboard() {
  try {
    const [robots, stats] = await Promise.all([RoboAPI.getRobots(), RoboAPI.getStats()])
    renderRobots(robots)
    renderStats(stats)
  } catch (err) {
    console.error('加载控制台数据失败:', err)
    robotsContainer.innerHTML = `<p style="color: var(--text-dim)">加载失败: ${err.message}</p>`
  }
}

// 视图切换(网格/列表)
document.querySelectorAll('.toggle-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'))
    btn.classList.add('active')
    // TODO: 实现列表视图布局
  })
})

// 添加机器人
addRobotBtn.addEventListener('click', () => {
  // TODO: 打开添加机器人表单
  alert('添加机器人功能开发中')
})

// 用户菜单 / 登出
userBtn.addEventListener('click', () => {
  // TODO: 改成下拉菜单(设置、登出等)
  if (confirm('要退出登录吗?')) {
    RoboSession.clear()
    window.location.href = 'auth.html'
  }
})

// 通知按钮
document.getElementById('notifications-btn').addEventListener('click', () => {
  // TODO: 显示通知列表
  alert('通知功能开发中')
})

// 显示用户名
const userName = localStorage.getItem('rn_user_name') || 'Austin'
const userNameEl = document.querySelector('.user-name')
const userAvatarEl = document.querySelector('.user-avatar')
if (userNameEl) userNameEl.textContent = userName
if (userAvatarEl) userAvatarEl.textContent = userName[0].toUpperCase()

// 初始化加载
loadDashboard()
