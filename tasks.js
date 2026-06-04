'use strict'

// ========== 任务调度面板 ==========
// 渲染任务列表、新建任务、取消任务,订阅 realtime 的 task:progress 推送。

const TASK_STATUS_META = {
  pending: { label: '待执行', color: '#94a3b8' },
  running: { label: '执行中', color: '#5b8cff' },
  done: { label: '已完成', color: '#34d399' },
  failed: { label: '失败', color: '#ef4444' },
}

let tasks = []

const taskContainer = document.getElementById('task-container')
const taskOverlay = document.getElementById('task-overlay')

function taskRowHTML(t) {
  const meta = TASK_STATUS_META[t.status] || TASK_STATUS_META.pending
  const showBar = t.status === 'running' || t.status === 'pending'
  return `
    <div class="task-row" data-id="${t.id}">
      <div class="task-cell task-id">${t.id}</div>
      <div class="task-cell task-robot-name">${t.robotName || t.robotId}</div>
      <div class="task-cell"><span class="task-type-tag">${t.type}</span></div>
      <div class="task-cell task-progress-cell">
        ${showBar ? `
          <div class="task-bar"><div class="task-bar-fill" style="width:${t.progress}%;background:${meta.color}"></div></div>
          <span class="task-progress-num">${t.progress}%</span>
        ` : `<span style="color:${meta.color};font-weight:600;">${t.status === 'done' ? '✓ 完成' : '✕ 失败'}</span>`}
      </div>
      <div class="task-cell">
        <span class="task-status" style="color:${meta.color};background:${meta.color}1a;">${meta.label}</span>
      </div>
      <div class="task-cell task-actions">
        ${t.status === 'running' || t.status === 'pending'
          ? `<button class="task-cancel-btn" data-cancel="${t.id}" title="取消任务">取消</button>`
          : ''}
      </div>
    </div>
  `
}

function renderTasks() {
  if (!taskContainer) return
  if (!tasks.length) {
    taskContainer.innerHTML = `<div class="task-empty">暂无任务,点击「新建任务」下发第一个任务</div>`
    return
  }
  taskContainer.innerHTML = `
    <div class="task-row task-head">
      <div class="task-cell">任务 ID</div>
      <div class="task-cell">机器人</div>
      <div class="task-cell">类型</div>
      <div class="task-cell">进度</div>
      <div class="task-cell">状态</div>
      <div class="task-cell"></div>
    </div>
    ${tasks.map(taskRowHTML).join('')}
  `
}

function updateTaskRow(t) {
  const row = taskContainer?.querySelector(`.task-row[data-id="${t.id}"]`)
  if (row) row.outerHTML = taskRowHTML(t)
  else renderTasks() // 行不存在(可能是新任务),整体重绘
}

async function loadTasks() {
  try {
    tasks = await RoboAPI.getTasks()
    renderTasks()
    if (window.RoboRealtime) RoboRealtime.seedTasks(tasks)
  } catch (err) {
    console.error('加载任务失败:', err)
    if (taskContainer) taskContainer.innerHTML = `<div class="task-empty">加载失败: ${err.message}</div>`
  }
}

// ---------- 新建任务弹窗 ----------
function openTaskModal() {
  const robotSelect = document.getElementById('task-robot')
  // 机器人下拉:优先用 dashboard 的 currentRobots,回退到任务里出现过的
  const robots = (window.currentRobots && window.currentRobots.length)
    ? window.currentRobots
    : dedupeRobotsFromTasks()
  robotSelect.innerHTML = robots.length
    ? robots.map((r) => `<option value="${r.id}|${r.name}">${r.name} (${r.id})</option>`).join('')
    : `<option value="RB-000|未命名机器人">未命名机器人</option>`
  taskOverlay.hidden = false
}

function dedupeRobotsFromTasks() {
  const seen = new Map()
  tasks.forEach((t) => {
    if (!seen.has(t.robotId)) seen.set(t.robotId, { id: t.robotId, name: t.robotName })
  })
  return [...seen.values()]
}

function closeTaskModal() {
  taskOverlay.hidden = true
}

async function submitTask() {
  const [robotId, robotName] = document.getElementById('task-robot').value.split('|')
  const type = document.getElementById('task-type').value
  const submitBtn = document.getElementById('task-submit')
  submitBtn.disabled = true
  submitBtn.textContent = '下发中...'
  try {
    const task = await RoboAPI.createTask({ robotId, robotName, type })
    tasks.unshift(task)
    renderTasks()
    if (window.RoboRealtime) RoboRealtime.seedTasks(tasks) // 让新任务进入实时推进
    closeTaskModal()
    if (window.RoboNotify) {
      RoboNotify.push({ level: 'info', message: `已向 ${robotName} 下发「${type}」任务`, robotName, time: new Date().toISOString() })
    }
  } catch (err) {
    alert('下发失败: ' + err.message)
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = '下发任务'
  }
}

async function cancelTask(id) {
  if (!confirm('确定取消该任务?')) return
  try {
    await RoboAPI.cancelTask(id)
    tasks = tasks.filter((t) => t.id !== id)
    renderTasks()
  } catch (err) {
    alert('取消失败: ' + err.message)
  }
}

// ---------- 事件绑定 ----------
document.getElementById('new-task-btn')?.addEventListener('click', openTaskModal)
document.getElementById('task-close')?.addEventListener('click', closeTaskModal)
document.getElementById('task-cancel')?.addEventListener('click', closeTaskModal)
document.getElementById('task-submit')?.addEventListener('click', submitTask)
taskOverlay?.addEventListener('click', (e) => {
  if (e.target.id === 'task-overlay') closeTaskModal()
})

taskContainer?.addEventListener('click', (e) => {
  const cancelId = e.target.dataset.cancel
  if (cancelId) cancelTask(cancelId)
})

// ---------- 实时进度订阅 ----------
if (window.RoboRealtime) {
  RoboRealtime.on('task:progress', ({ id, progress, status }) => {
    const t = tasks.find((x) => x.id === id)
    if (!t) return
    if (typeof progress === 'number') t.progress = progress
    if (status) t.status = status
    updateTaskRow(t)
  })
}

loadTasks()
