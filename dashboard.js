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
        ${robot.isCustom ? `
          <div class="meta-row">
            <span class="meta-label">形态</span>
            <span class="meta-value">${formLabel(robot.form)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">智能/运动</span>
            <span class="meta-value">${Math.round(robot.stats.intelligence)}/${Math.round(robot.stats.mobility)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">技能数</span>
            <span class="meta-value">${robot.skills.length}</span>
          </div>
        ` : `
          <div class="meta-row">
            <span class="meta-label">电量</span>
            <span class="meta-value">${robot.battery}%</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">任务数</span>
            <span class="meta-value">${robot.tasks}</span>
          </div>
        `}
        <div class="meta-row">
          <span class="meta-label">${robot.isCustom ? '创建于' : '最后上线'}</span>
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

function formLabel(form) {
  return { humanoid: '🚶 人形', quadruped: '🐕 四足', wheeled: '🛞 轮式', arm: '🦾 机械臂' }[form] || form
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
    // 优先使用本地保存的机器人,没有则用 API 获取(mock 或真实后端)
    let robots = []
    const savedRobots = JSON.parse(localStorage.getItem('rn_my_robots') || '[]')

    if (savedRobots.length) {
      // 用户已保存机器人,转成 dashboard 需要的格式
      robots = savedRobots.map((r) => ({
        id: r.id,
        name: r.name,
        status: 'offline', // 保存的设计,默认离线
        battery: 0,
        tasks: 0,
        lastSeen: formatTime(r.createdAt),
        // 附加:自定义机器人的特殊字段
        isCustom: true,
        form: r.form,
        stats: r.stats,
        skills: r.skills,
      }))
    } else {
      // 没有保存机器人,从 API 拉取(含 mock 数据)
      robots = await RoboAPI.getRobots()
    }

    const stats = await RoboAPI.getStats()
    renderRobots(robots)
    renderStats(stats)
  } catch (err) {
    console.error('加载控制台数据失败:', err)
    robotsContainer.innerHTML = `<p style="color: var(--text-dim)">加载失败: ${err.message}</p>`
  }
}

function formatTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${Math.floor(diff / 86400)}天前`
}

// 视图切换(网格/列表)
document.querySelectorAll('.toggle-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'))
    btn.classList.add('active')
    // TODO: 实现列表视图布局
  })
})

// 添加机器人 → 进入组装实验室
addRobotBtn.addEventListener('click', () => {
  window.location.href = 'builder.html'
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
