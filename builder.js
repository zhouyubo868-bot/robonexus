'use strict'

// 登录守卫
if (!localStorage.getItem('rn_logged_in')) {
  window.location.href = 'auth.html'
}

const { SLOTS, PARTS, checkCompatibility, computeStats } = window.RobotParts

// 当前组装状态：{ slotId: partObject }
let build = {}
let robotName = ''

// ========== DOM 引用 ==========
const slotListEl = document.getElementById('slot-list')
const robotCanvas = document.getElementById('robot-canvas')
const robotNameInput = document.getElementById('robot-name')
const robotFormBadge = document.getElementById('robot-form-badge')
const skillTagsEl = document.getElementById('skill-tags')
const issuesBlock = document.getElementById('issues-block')
const saveBtn = document.getElementById('save-build-btn')
const resetBtn = document.getElementById('reset-btn')

const pickerOverlay = document.getElementById('picker-overlay')
const pickerTitle = document.getElementById('picker-title')
const pickerBody = document.getElementById('picker-body')
const pickerClose = document.getElementById('picker-close')

// ========== 渲染：左侧槽位列表 ==========
function renderSlots() {
  slotListEl.innerHTML = SLOTS.map((slot) => {
    const part = build[slot.id]
    const filled = !!part
    const tierBadge = filled
      ? `<span class="slot-tier tier-${part.tier}">${tierName(part.tier)}</span>`
      : ''
    return `
      <div class="slot-item ${filled ? 'filled' : ''}" data-slot="${slot.id}">
        <div class="slot-icon">${slot.icon}</div>
        <div class="slot-info">
          <div class="slot-name">${slot.name}</div>
          <div class="slot-value">${
            filled ? part.name : `<span class="slot-empty">${slot.desc}</span>`
          }</div>
        </div>
        ${tierBadge}
      </div>
    `
  }).join('')

  slotListEl.querySelectorAll('.slot-item').forEach((el) => {
    el.addEventListener('click', () => openPicker(el.dataset.slot))
  })
}

function tierName(tier) {
  return { flagship: '旗舰', high: '高配', mid: '标配', basic: '基础' }[tier] || tier
}

// ========== 渲染：中间机器人 SVG ==========
// 根据形态(humanoid / quadruped / wheeled / arm)绘制对应外形
// 槽位会随装配状态高亮(equipped 类)
function renderRobot() {
  const form = build.frame?.form || 'placeholder'
  const eq = (slotId) => (build[slotId] ? 'equipped' : '')

  let svg = ''

  if (form === 'placeholder') {
    svg = `
      <svg class="robot-svg" viewBox="0 0 220 320" xmlns="http://www.w3.org/2000/svg">
        <text x="110" y="160" text-anchor="middle" fill="#56688a" font-size="14"
              font-family="Segoe UI">先选择骨架形态</text>
      </svg>`
    robotFormBadge.textContent = '未选形态'
  } else if (form === 'humanoid') {
    svg = humanoidSVG(eq)
    robotFormBadge.textContent = '🚶 人形'
  } else if (form === 'quadruped') {
    svg = quadrupedSVG(eq)
    robotFormBadge.textContent = '🐕 四足'
  } else if (form === 'wheeled') {
    svg = wheeledSVG(eq)
    robotFormBadge.textContent = '🛞 轮式'
  } else if (form === 'arm') {
    svg = armSVG(eq)
    robotFormBadge.textContent = '🦾 机械臂'
  }

  robotCanvas.innerHTML = svg

  // 绑定 SVG 上的槽位热区点击
  robotCanvas.querySelectorAll('[data-slot]').forEach((el) => {
    el.classList.add('slot-hot')
    el.addEventListener('click', () => openPicker(el.dataset.slot))
  })
}

// ========== SVG 形态：共用渐变定义 ==========
const SVG_DEFS = `
  <defs>
    <linearGradient id="equippedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#17c8c8" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#5b8cff" stop-opacity="0.3"/>
    </linearGradient>
  </defs>`

// 人形机器人:大脑在头/小脑在颈/传感器在胸/电源在腰/执行器为四肢/骨架是躯干
function humanoidSVG(eq) {
  return `
    <svg class="robot-svg" viewBox="0 0 220 360" xmlns="http://www.w3.org/2000/svg">
      ${SVG_DEFS}
      <rect data-slot="brain" class="robot-part ${eq('brain')}"
            x="80" y="20" width="60" height="55" rx="14" />
      <text class="part-label" x="110" y="50">BRAIN</text>
      <circle data-slot="cerebellum" class="robot-part ${eq('cerebellum')}"
              cx="110" cy="84" r="10" />
      <rect data-slot="frame" class="robot-part ${eq('frame')}"
            x="65" y="100" width="90" height="100" rx="10" />
      <text class="part-label" x="110" y="155">FRAME</text>
      <circle data-slot="sensor" class="robot-part ${eq('sensor')}"
              cx="110" cy="125" r="8" />
      <rect data-slot="power" class="robot-part ${eq('power')}"
            x="80" y="208" width="60" height="22" rx="6" />
      <text class="part-label" x="110" y="223">POWER</text>
      <rect data-slot="actuator" class="robot-part ${eq('actuator')}"
            x="38" y="105" width="22" height="80" rx="10" />
      <rect data-slot="actuator" class="robot-part ${eq('actuator')}"
            x="160" y="105" width="22" height="80" rx="10" />
      <rect data-slot="actuator" class="robot-part ${eq('actuator')}"
            x="75" y="240" width="22" height="100" rx="10" />
      <rect data-slot="actuator" class="robot-part ${eq('actuator')}"
            x="123" y="240" width="22" height="100" rx="10" />
      <ellipse class="robot-part" cx="86" cy="345" rx="16" ry="6" />
      <ellipse class="robot-part" cx="134" cy="345" rx="16" ry="6" />
    </svg>`
}

// 四足:头部=大脑+小脑;躯干=骨架+电源+传感器;四条腿=执行器
function quadrupedSVG(eq) {
  return `
    <svg class="robot-svg" viewBox="0 0 280 240" xmlns="http://www.w3.org/2000/svg">
      ${SVG_DEFS}
      <rect data-slot="brain" class="robot-part ${eq('brain')}"
            x="200" y="60" width="55" height="38" rx="10" />
      <text class="part-label" x="227" y="84">BRAIN</text>
      <circle data-slot="cerebellum" class="robot-part ${eq('cerebellum')}"
              cx="220" cy="115" r="9" />
      <rect data-slot="frame" class="robot-part ${eq('frame')}"
            x="40" y="80" width="170" height="60" rx="10" />
      <text class="part-label" x="125" y="115">FRAME</text>
      <circle data-slot="sensor" class="robot-part ${eq('sensor')}"
              cx="195" cy="100" r="7" />
      <rect data-slot="power" class="robot-part ${eq('power')}"
            x="80" y="92" width="80" height="20" rx="5" />
      <text class="part-label" x="120" y="106">POWER</text>
      <rect data-slot="actuator" class="robot-part ${eq('actuator')}"
            x="55" y="140" width="20" height="60" rx="6" />
      <rect data-slot="actuator" class="robot-part ${eq('actuator')}"
            x="95" y="140" width="20" height="60" rx="6" />
      <rect data-slot="actuator" class="robot-part ${eq('actuator')}"
            x="135" y="140" width="20" height="60" rx="6" />
      <rect data-slot="actuator" class="robot-part ${eq('actuator')}"
            x="175" y="140" width="20" height="60" rx="6" />
      <ellipse class="robot-part" cx="65" cy="208" rx="14" ry="5" />
      <ellipse class="robot-part" cx="105" cy="208" rx="14" ry="5" />
      <ellipse class="robot-part" cx="145" cy="208" rx="14" ry="5" />
      <ellipse class="robot-part" cx="185" cy="208" rx="14" ry="5" />
    </svg>`
}

// 轮式:上半身=头(大脑+小脑+传感器)+单臂(执行器);下半身=轮式底盘(骨架+电源)
function wheeledSVG(eq) {
  return `
    <svg class="robot-svg" viewBox="0 0 220 320" xmlns="http://www.w3.org/2000/svg">
      ${SVG_DEFS}
      <rect data-slot="brain" class="robot-part ${eq('brain')}"
            x="75" y="20" width="70" height="55" rx="14" />
      <text class="part-label" x="110" y="50">BRAIN</text>
      <circle data-slot="cerebellum" class="robot-part ${eq('cerebellum')}"
              cx="110" cy="86" r="9" />
      <circle data-slot="sensor" class="robot-part ${eq('sensor')}"
              cx="92" cy="48" r="6" />
      <circle data-slot="sensor" class="robot-part ${eq('sensor')}"
              cx="128" cy="48" r="6" />
      <rect data-slot="actuator" class="robot-part ${eq('actuator')}"
            x="160" y="100" width="22" height="100" rx="10" />
      <rect data-slot="frame" class="robot-part ${eq('frame')}"
            x="50" y="100" width="100" height="120" rx="14" />
      <text class="part-label" x="100" y="160">FRAME</text>
      <rect data-slot="power" class="robot-part ${eq('power')}"
            x="65" y="180" width="70" height="22" rx="6" />
      <text class="part-label" x="100" y="195">POWER</text>
      <circle class="robot-part" cx="65" cy="250" r="22" />
      <circle class="robot-part" cx="135" cy="250" r="22" />
    </svg>`
}

// 机械臂:基座(骨架+电源)+多节臂(执行器)+末端(传感器+大脑+小脑)
function armSVG(eq) {
  return `
    <svg class="robot-svg" viewBox="0 0 220 320" xmlns="http://www.w3.org/2000/svg">
      ${SVG_DEFS}
      <rect data-slot="frame" class="robot-part ${eq('frame')}"
            x="60" y="240" width="100" height="50" rx="8" />
      <text class="part-label" x="110" y="270">FRAME</text>
      <rect data-slot="power" class="robot-part ${eq('power')}"
            x="75" y="252" width="70" height="20" rx="4" />
      <rect data-slot="actuator" class="robot-part ${eq('actuator')}"
            x="95" y="170" width="30" height="80" rx="8" />
      <rect data-slot="actuator" class="robot-part ${eq('actuator')}"
            x="95" y="100" width="30" height="80" rx="8" transform="rotate(-30 110 140)" />
      <rect data-slot="actuator" class="robot-part ${eq('actuator')}"
            x="115" y="50" width="26" height="60" rx="7" transform="rotate(20 128 80)" />
      <rect data-slot="brain" class="robot-part ${eq('brain')}"
            x="135" y="30" width="48" height="36" rx="8" />
      <text class="part-label" x="159" y="52">BRAIN</text>
      <circle data-slot="cerebellum" class="robot-part ${eq('cerebellum')}"
              cx="155" cy="78" r="8" />
      <circle data-slot="sensor" class="robot-part ${eq('sensor')}"
              cx="170" cy="92" r="7" />
    </svg>`
}
// ========== 渲染：右侧属性面板 ==========
function renderStats() {
  const stats = computeStats(build)
  const filled = !!stats

  // 评分条
  const setBar = (idBar, idNum, val) => {
    const v = filled ? Math.round(val) : 0
    document.getElementById(idBar).style.width = `${v}%`
    document.getElementById(idNum).textContent = filled ? v : '—'
  }
  setBar('bar-intel', 'num-intel', stats?.intelligence)
  setBar('bar-mobi',  'num-mobi',  stats?.mobility)
  setBar('bar-perc',  'num-perc',  stats?.perception)
  setBar('bar-stab',  'num-stab',  stats?.stability)

  // 6 项指标
  const setMetric = (id, val, decimals = 0) => {
    document.getElementById(id).textContent =
      filled ? Number(val).toFixed(decimals) : '—'
  }
  setMetric('m-compute', stats?.compute, 0)
  setMetric('m-power',   stats?.power,   0)
  setMetric('m-runtime', stats?.runtime, 1)
  setMetric('m-dof',     stats?.dof,     0)
  setMetric('m-weight',  stats?.weight,  1)
  setMetric('m-cost',    stats?.cost,    1)

  // 技能标签
  if (filled && stats.skills.length) {
    skillTagsEl.innerHTML = stats.skills
      .map((s) => `<span class="skill-tag">${s}</span>`).join('')
  } else {
    skillTagsEl.innerHTML = `<span class="skill-empty">装配组件后会显示机器人的技能</span>`
  }

  // 兼容性提示
  const issues = checkCompatibility(build)
  if (!issues.length && filled) {
    issuesBlock.innerHTML = `<div class="issue-item info">✓ 所有组件兼容良好</div>`
    saveBtn.disabled = false
  } else if (!Object.keys(build).length) {
    issuesBlock.innerHTML = `<div class="issues-empty">完成所有槽位装配后会显示兼容性提示</div>`
    saveBtn.disabled = true
  } else {
    issuesBlock.innerHTML = issues.map((i) =>
      `<div class="issue-item ${i.level}">${
        i.level === 'error' ? '⚠' : i.level === 'warn' ? '!' : 'ⓘ'
      } ${i.message}</div>`
    ).join('')
    saveBtn.disabled = issues.some((i) => i.level === 'error') || !filled
  }
}

// ========== 组件选择浮层 ==========
let activeSlot = null

function openPicker(slotId) {
  activeSlot = slotId
  const slot = SLOTS.find((s) => s.id === slotId)
  pickerTitle.textContent = `选择${slot.name}`
  const candidates = PARTS[slotId] || []
  const currentId = build[slotId]?.id

  pickerBody.innerHTML = candidates.map((p) => {
    const stats = Object.entries(p.stats || {})
      .slice(0, 4)
      .map(([k, v]) => `<span class="part-stat">${statLabel(k)}: ${v}</span>`)
      .join('')
    const skills = (p.skills || []).slice(0, 4)
      .map((s) => `<span class="part-skill">${s}</span>`).join('')
    return `
      <div class="part-card ${currentId === p.id ? 'selected' : ''}" data-id="${p.id}">
        <div class="part-card-head">
          <div class="part-name">${p.name}</div>
          <span class="slot-tier tier-${p.tier}">${tierName(p.tier)}</span>
        </div>
        <div class="part-desc">${p.desc}</div>
        <div class="part-stats">${stats}</div>
        <div class="part-skills">${skills}</div>
      </div>
    `
  }).join('')

  pickerBody.querySelectorAll('.part-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.id
      const part = candidates.find((p) => p.id === id)
      build[slotId] = part
      closePicker()
      renderAll()
    })
  })

  pickerOverlay.hidden = false
}

function closePicker() {
  pickerOverlay.hidden = true
  activeSlot = null
}

function statLabel(k) {
  return {
    compute: '算力', power: '功耗', weight: '重量', cost: '成本',
    dof: '自由度', battery: '电池', voltage: '电压',
    intelligence: '智能', perception: '感知', mobility: '运动',
    stability: '稳定', durability: '耐用', torque: '扭矩', speed: '速度',
  }[k] || k
}

// ========== 全局渲染入口 ==========
function renderAll() {
  renderSlots()
  renderRobot()
  renderStats()
}

// ========== 事件绑定 ==========
pickerClose.addEventListener('click', closePicker)
pickerOverlay.addEventListener('click', (e) => {
  if (e.target === pickerOverlay) closePicker()
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !pickerOverlay.hidden) closePicker()
})

robotNameInput.addEventListener('input', () => {
  robotName = robotNameInput.value.trim()
})

resetBtn.addEventListener('click', () => {
  if (!Object.keys(build).length || confirm('清空所有已装配的组件?')) {
    build = {}
    robotName = ''
    robotNameInput.value = ''
    renderAll()
  }
})

// 旗舰预设：每个槽位选 flagship/high 档
document.getElementById('preset-flagship').addEventListener('click', () => {
  build = {}
  for (const slot of SLOTS) {
    const list = PARTS[slot.id]
    build[slot.id] = list.find((p) => p.tier === 'flagship') || list[0]
  }
  if (!robotNameInput.value) {
    robotNameInput.value = '旗舰原型机'
    robotName = robotNameInput.value
  }
  renderAll()
})

// 经济预设：mid/basic 档为主，但小脑必须满足传感器依赖
document.getElementById('preset-budget').addEventListener('click', () => {
  build = {
    brain:      PARTS.brain.find((p) => p.tier === 'mid'),
    cerebellum: PARTS.cerebellum.find((p) => p.id === 'cere-mpc'),
    frame:      PARTS.frame.find((p) => p.id === 'frame-wheeled'),
    actuator:   PARTS.actuator.find((p) => p.tier === 'mid'),
    sensor:     PARTS.sensor.find((p) => p.tier === 'mid'),
    power:      PARTS.power.find((p) => p.tier === 'mid'),
  }
  if (!robotNameInput.value) {
    robotNameInput.value = '经济服务机'
    robotName = robotNameInput.value
  }
  renderAll()
})

// 保存：写入本地，跳回 dashboard
saveBtn.addEventListener('click', () => {
  const stats = computeStats(build)
  if (!stats) return
  const saved = JSON.parse(localStorage.getItem('rn_my_robots') || '[]')
  saved.push({
    id: 'MY-' + Date.now().toString(36).toUpperCase(),
    name: robotName || `机器人 #${saved.length + 1}`,
    parts: Object.fromEntries(
      Object.entries(build).map(([k, v]) => [k, v.id])
    ),
    stats: {
      intelligence: stats.intelligence, mobility: stats.mobility,
      perception: stats.perception, stability: stats.stability,
      compute: stats.compute, power: stats.power, runtime: stats.runtime,
      dof: stats.dof, weight: stats.weight, cost: stats.cost,
    },
    skills: stats.skills,
    form: stats.form,
    createdAt: new Date().toISOString(),
  })
  localStorage.setItem('rn_my_robots', JSON.stringify(saved))
  alert(`机器人「${robotName || '未命名'}」已保存!`)
  window.location.href = 'dashboard.html'
})

// 用户菜单(顶栏)
document.getElementById('user-btn').addEventListener('click', () => {
  if (confirm('要退出登录吗?')) {
    RoboSession.clear()
    window.location.href = 'auth.html'
  }
})

// 用户名显示
const userName = localStorage.getItem('rn_user_name') || 'Austin'
document.querySelector('.user-name').textContent = userName
document.querySelector('.user-avatar').textContent = userName[0].toUpperCase()

// ========== 启动 ==========
renderAll()
