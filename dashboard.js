'use strict'

// 登录守卫：未登录直接跳回认证页(放最前,避免内容闪现)
if (!localStorage.getItem('rn_logged_in')) {
  window.location.href = 'auth.html'
}

const { SLOTS, PARTS, SCENARIOS, evaluateScenario, gradeRobot } = window.RobotParts || {}

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
      (robot) => {
        const gradeColors = { S: '#f59e0b', A: '#10b981', B: '#3b82f6', C: '#8b5cf6', D: '#6b7280' }
        const gradeBadge = robot.grade ? `
          <div style="position: absolute; top: 12px; right: 12px; width: 36px; height: 36px;
                      border-radius: 50%; background: ${gradeColors[robot.grade]}22;
                      border: 2px solid ${gradeColors[robot.grade]}; display: grid; place-items: center;
                      font-weight: 800; font-size: 18px; color: ${gradeColors[robot.grade]};">
            ${robot.grade}
          </div>
        ` : ''
        return `
    <div class="robot-card" data-id="${robot.id}" style="position: relative;">
      ${gradeBadge}
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
      }
    )
    .join('')

  // 点击卡片查看详情
  document.querySelectorAll('.robot-card').forEach((card) => {
    card.addEventListener('click', () => {
      const robotId = card.dataset.id
      const robot = robots.find((r) => r.id === robotId)
      if (robot) openDetail(robot)
    })
  })
}

// ========== 机器人详情弹窗 ==========
let currentDetailRobot = null

function openDetail(robot) {
  currentDetailRobot = robot
  const detailOverlay = document.getElementById('detail-overlay')
  const detailName = document.getElementById('detail-name')
  const detailBadge = document.getElementById('detail-badge')
  const detailBody = document.getElementById('detail-body')

  detailName.textContent = robot.name
  detailBadge.textContent = robot.isCustom ? formLabel(robot.form) : robot.status.toUpperCase()

  if (robot.isCustom) {
    // 自定义机器人:显示配置、属性、场景评分、评级
    const grade = gradeRobot(robot.stats)
    const gradeColor = { S: '#f59e0b', A: '#10b981', B: '#3b82f6', C: '#8b5cf6', D: '#6b7280' }[grade.grade]

    detailBody.innerHTML = `
      <!-- 评级卡片 -->
      <div class="detail-section">
        <div class="detail-section-title">整体评级</div>
        <div class="detail-stat-card" style="background: linear-gradient(135deg, ${gradeColor}22, transparent); border-color: ${gradeColor}55;">
          <div class="detail-stat-label">综合等级</div>
          <div class="detail-stat-value" style="color: ${gradeColor}; font-size: 48px;">
            ${grade.grade}
            <small style="font-size: 16px;">级</small>
          </div>
          ${grade.bestScenario ? `
            <div style="margin-top: 8px; font-size: 13px; color: var(--text-dim);">
              最佳场景: ${grade.bestScenario.name} (${grade.bestScore} 分)
            </div>
          ` : ''}
        </div>
      </div>

      <!-- 综合属性 -->
      <div class="detail-section">
        <div class="detail-section-title">综合属性</div>
        <div class="detail-stats-grid">
          <div class="detail-stat-card">
            <div class="detail-stat-label">智能</div>
            <div class="detail-stat-value">${Math.round(robot.stats.intelligence)}</div>
          </div>
          <div class="detail-stat-card">
            <div class="detail-stat-label">运动</div>
            <div class="detail-stat-value">${Math.round(robot.stats.mobility)}</div>
          </div>
          <div class="detail-stat-card">
            <div class="detail-stat-label">感知</div>
            <div class="detail-stat-value">${Math.round(robot.stats.perception)}</div>
          </div>
          <div class="detail-stat-card">
            <div class="detail-stat-label">稳定</div>
            <div class="detail-stat-value">${Math.round(robot.stats.stability)}</div>
          </div>
          <div class="detail-stat-card">
            <div class="detail-stat-label">算力</div>
            <div class="detail-stat-value">${robot.stats.compute} <small>TOPS</small></div>
          </div>
          <div class="detail-stat-card">
            <div class="detail-stat-label">续航</div>
            <div class="detail-stat-value">${robot.stats.runtime.toFixed(1)} <small>h</small></div>
          </div>
          <div class="detail-stat-card">
            <div class="detail-stat-label">重量</div>
            <div class="detail-stat-value">${robot.stats.weight.toFixed(1)} <small>kg</small></div>
          </div>
          <div class="detail-stat-card">
            <div class="detail-stat-label">成本</div>
            <div class="detail-stat-value">${robot.stats.cost.toFixed(1)} <small>万</small></div>
          </div>
        </div>
      </div>

      <!-- 装配配置 -->
      <div class="detail-section">
        <div class="detail-section-title">装配配置</div>
        <div class="detail-parts-list">
          ${renderPartsList(robot.parts)}
        </div>
      </div>

      <!-- 场景挑战评分 -->
      <div class="detail-section">
        <div class="detail-section-title">场景挑战评分</div>
        ${renderScenarioScores(robot.stats)}
      </div>

      <!-- 技能列表 -->
      <div class="detail-section">
        <div class="detail-section-title">已解锁技能 (${robot.skills.length})</div>
        <div class="detail-skills">
          ${robot.skills.map((s) => `<span class="detail-skill">${s}</span>`).join('')}
        </div>
      </div>
    `
  } else {
    // 模拟机器人:简单显示
    detailBody.innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">运行状态</div>
        <div class="detail-stats-grid">
          <div class="detail-stat-card">
            <div class="detail-stat-label">状态</div>
            <div class="detail-stat-value">${STATUS_TEXT[robot.status]}</div>
          </div>
          <div class="detail-stat-card">
            <div class="detail-stat-label">电量</div>
            <div class="detail-stat-value">${robot.battery} <small>%</small></div>
          </div>
          <div class="detail-stat-card">
            <div class="detail-stat-label">任务数</div>
            <div class="detail-stat-value">${robot.tasks}</div>
          </div>
        </div>
      </div>
      <p style="color: var(--text-dim); text-align: center; margin-top: 20px;">
        这是模拟机器人,详细信息暂不可用。
      </p>
    `
  }

  detailOverlay.hidden = false
}

function closeDetail() {
  document.getElementById('detail-overlay').hidden = true
  currentDetailRobot = null
}

function renderPartsList(partsMap) {
  if (!SLOTS || !PARTS) return '<p>配置加载中...</p>'
  return SLOTS.map((slot) => {
    const partId = partsMap[slot.id]
    const part = PARTS[slot.id]?.find((p) => p.id === partId)
    if (!part) return ''
    return `
      <div class="detail-part-row">
        <div class="detail-part-icon">${slot.icon}</div>
        <div class="detail-part-info">
          <div class="detail-part-slot">${slot.name}</div>
          <div class="detail-part-name">${part.name}</div>
        </div>
      </div>
    `
  }).join('')
}

function renderScenarioScores(stats) {
  if (!SCENARIOS || !evaluateScenario) return '<p>评分系统加载中...</p>'
  return SCENARIOS.map((sc) => {
    const result = evaluateScenario(stats, sc.id)
    const score = result.score
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : '#f59e0b'
    return `
      <div class="detail-stat-card" style="margin-bottom: 10px;">
        <div class="detail-stat-label">${sc.name}</div>
        <div class="detail-stat-value" style="color: ${color};">
          ${score} <small>分</small>
          ${result.pass ? '✓' : ''}
        </div>
        <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">
          ${sc.desc}
        </div>
        ${result.missingMust.length ? `
          <div style="font-size: 11px; color: #ff5d5d; margin-top: 4px;">
            ⚠ 缺少必需技能: ${result.missingMust.join(', ')}
          </div>
        ` : ''}
      </div>
    `
  }).join('')
}

// 详情弹窗事件
document.getElementById('detail-close').addEventListener('click', closeDetail)
document.getElementById('detail-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'detail-overlay') closeDetail()
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('detail-overlay').hidden) closeDetail()
})

document.getElementById('detail-edit').addEventListener('click', () => {
  if (!currentDetailRobot?.isCustom) {
    alert('只能编辑自定义机器人')
    return
  }
  // TODO: 加载配置进 builder 编辑
  alert('编辑功能即将完成')
})

document.getElementById('detail-delete').addEventListener('click', () => {
  if (!currentDetailRobot?.isCustom) {
    alert('只能删除自定义机器人')
    return
  }
  if (!confirm(`确定删除机器人「${currentDetailRobot.name}」?`)) return

  const saved = JSON.parse(localStorage.getItem('rn_my_robots') || '[]')
  const updated = saved.filter((r) => r.id !== currentDetailRobot.id)
  localStorage.setItem('rn_my_robots', JSON.stringify(updated))
  closeDetail()
  loadDashboard() // 重新加载
})

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
