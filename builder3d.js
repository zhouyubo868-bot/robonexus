'use strict'

// ==================== 全局变量 ====================
let scene, camera, renderer, controls
let robot = null
let selectedPart = null
let raycaster, mouse

// ==================== 元件数据定义 ====================
const PART_DEFINITIONS = {
  chassis: {
    wheel: { name: '轮式底盘', color: 0x3b82f6, stats: { mobility: 8, stability: 6 } },
    track: { name: '履带底盘', color: 0x8b5cf6, stats: { stability: 9, load: 7 } },
    hover: { name: '悬浮底盘', color: 0x06b6d4, stats: { mobility: 10, agility: 8 } }
  },
  sensor: {
    camera: { name: '视觉相机', color: 0x10b981, stats: { perception: 7, intelligence: 5 } },
    lidar: { name: '激光雷达', color: 0xf59e0b, stats: { perception: 9, precision: 8 } },
    ultrasonic: { name: '超声波', color: 0x6366f1, stats: { perception: 5, reaction: 6 } }
  },
  actuator: {
    arm: { name: '机械臂', color: 0xef4444, stats: { operation: 8, strength: 7 } },
    gripper: { name: '夹爪', color: 0xec4899, stats: { operation: 6, precision: 8 } }
  },
  controller: {
    basic: { name: '基础芯片', color: 0x64748b, stats: { intelligence: 5, efficiency: 6 } },
    ai: { name: 'AI芯片', color: 0xa855f7, stats: { intelligence: 10, learning: 9 } }
  }
}

// ==================== 3D 模型工厂 ====================
function createChassis(id) {
  const group = new THREE.Group()
  const def = PART_DEFINITIONS.chassis[id]

  if (id === 'wheel') {
    // 轮式：圆柱体 + 4个轮子
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.3, 32),
      new THREE.MeshStandardMaterial({ color: def.color, metalness: 0.6, roughness: 0.4 })
    )
    group.add(body)

    const wheelGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b })
    const positions = [[0.6, -0.15, 0.6], [0.6, -0.15, -0.6], [-0.6, -0.15, 0.6], [-0.6, -0.15, -0.6]]
    positions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat)
      wheel.position.set(x, y, z)
      wheel.rotation.z = Math.PI / 2
      group.add(wheel)
    })
  } else if (id === 'track') {
    // 履带：长方体
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.3, 1.6),
      new THREE.MeshStandardMaterial({ color: def.color, metalness: 0.7, roughness: 0.3 })
    )
    group.add(body)
  } else if (id === 'hover') {
    // 悬浮：圆盘 + 发光环
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: def.color, metalness: 0.8, roughness: 0.2 })
    )
    group.add(disc)

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.05, 16, 32),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.5
      })
    )
    ring.rotation.x = Math.PI / 2
    ring.position.y = -0.15
    group.add(ring)
  }

  group.userData = { type: 'chassis', id, name: def.name, stats: def.stats }
  return group
}

function createSensor(id) {
  const group = new THREE.Group()
  const def = PART_DEFINITIONS.sensor[id]

  if (id === 'camera') {
    // 相机：球体 + 圆柱
    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 32, 32),
      new THREE.MeshStandardMaterial({ color: def.color, metalness: 0.5, roughness: 0.3 })
    )
    lens.position.y = 0.15
    group.add(lens)

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    )
    group.add(body)
  } else if (id === 'lidar') {
    // 雷达：旋转圆锥阵列
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: def.color })
    )
    group.add(base)

    for (let i = 0; i < 8; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.3, 8),
        new THREE.MeshStandardMaterial({
          color: def.color,
          emissive: def.color,
          emissiveIntensity: 0.3
        })
      )
      cone.rotation.z = Math.PI / 2
      cone.position.x = 0.2
      cone.rotation.y = (i / 8) * Math.PI * 2
      group.add(cone)
    }
  } else if (id === 'ultrasonic') {
    // 超声波：小圆柱
    const sensor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: def.color })
    )
    group.add(sensor)
  }

  group.userData = { type: 'sensor', id, name: def.name, stats: def.stats }
  return group
}

function createActuator(id) {
  const group = new THREE.Group()
  const def = PART_DEFINITIONS.actuator[id]

  if (id === 'arm') {
    // 机械臂：圆柱链
    const segments = 3
    for (let i = 0; i < segments; i++) {
      const segment = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: def.color, metalness: 0.6 })
      )
      segment.position.y = 0.2 + i * 0.4
      group.add(segment)

      const joint = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      )
      joint.position.y = i * 0.4
      group.add(joint)
    }
  } else if (id === 'gripper') {
    // 夹爪：两个小立方体
    const finger1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.3, 0.05),
      new THREE.MeshStandardMaterial({ color: def.color })
    )
    finger1.position.set(-0.1, 0.15, 0)
    group.add(finger1)

    const finger2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.3, 0.05),
      new THREE.MeshStandardMaterial({ color: def.color })
    )
    finger2.position.set(0.1, 0.15, 0)
    group.add(finger2)
  }

  group.userData = { type: 'actuator', id, name: def.name, stats: def.stats }
  return group
}

function createController(id) {
  const def = PART_DEFINITIONS.controller[id]
  const group = new THREE.Group()

  const chip = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.1, 0.4),
    new THREE.MeshStandardMaterial({
      color: def.color,
      metalness: 0.8,
      emissive: id === 'ai' ? def.color : 0x000000,
      emissiveIntensity: id === 'ai' ? 0.3 : 0
    })
  )
  group.add(chip)

  group.userData = { type: 'controller', id, name: def.name, stats: def.stats }
  return group
}

// ==================== Robot 类 ====================
class Robot {
  constructor() {
    this.group = new THREE.Group()
    this.parts = []
    scene.add(this.group)
  }

  addPart(partMesh) {
    this.parts.push(partMesh)
    this.group.add(partMesh)
    this.updateLayout()
    this.calculateStats()
  }

  removePart(partMesh) {
    const index = this.parts.indexOf(partMesh)
    if (index > -1) {
      this.parts.splice(index, 1)
      this.group.remove(partMesh)
      this.updateLayout()
      this.calculateStats()
    }
  }

  updateLayout() {
    let yOffset = 0

    // 底盘在最底层
    const chassis = this.parts.filter(p => p.userData.type === 'chassis')
    chassis.forEach(p => {
      p.position.y = yOffset
      yOffset += 0.5
    })

    // 控制器堆叠在底盘上
    const controllers = this.parts.filter(p => p.userData.type === 'controller')
    controllers.forEach(p => {
      p.position.set(0, yOffset, 0)
      yOffset += 0.3
    })

    // 传感器在顶部
    const sensors = this.parts.filter(p => p.userData.type === 'sensor')
    sensors.forEach((p, i) => {
      const angle = (i / sensors.length) * Math.PI * 2
      p.position.set(Math.cos(angle) * 0.5, yOffset, Math.sin(angle) * 0.5)
    })

    // 执行器在侧面
    const actuators = this.parts.filter(p => p.userData.type === 'actuator')
    actuators.forEach((p, i) => {
      const side = i % 2 === 0 ? 1 : -1
      p.position.set(side * 0.8, yOffset - 0.5, 0)
    })
  }

  calculateStats() {
    const stats = {}
    this.parts.forEach(part => {
      Object.entries(part.userData.stats || {}).forEach(([key, value]) => {
        stats[key] = (stats[key] || 0) + value
      })
    })
    this.stats = stats
    updateInfoBar()
  }

  clear() {
    this.parts.forEach(p => this.group.remove(p))
    this.parts = []
    this.stats = {}
    updateInfoBar()
  }

  toJSON() {
    return {
      parts: this.parts.map(p => ({ type: p.userData.type, id: p.userData.id }))
    }
  }

  fromJSON(data) {
    this.clear()
    data.parts.forEach(({ type, id }) => {
      let partMesh
      if (type === 'chassis') partMesh = createChassis(id)
      else if (type === 'sensor') partMesh = createSensor(id)
      else if (type === 'actuator') partMesh = createActuator(id)
      else if (type === 'controller') partMesh = createController(id)
      if (partMesh) this.addPart(partMesh)
    })
  }
}

// ==================== 场景初始化 ====================
function init() {
  const container = document.getElementById('canvas-container')

  // 场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0e1a)
  scene.fog = new THREE.Fog(0x0a0e1a, 10, 50)

  // 相机
  camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  )
  camera.position.set(5, 5, 10)
  camera.lookAt(0, 0, 0)

  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  // 轨道控制
  controls = new THREE.OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.maxDistance = 20
  controls.minDistance = 2

  // 光照
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(5, 10, 7)
  dirLight.castShadow = true
  dirLight.shadow.camera.near = 0.1
  dirLight.shadow.camera.far = 50
  dirLight.shadow.camera.left = -10
  dirLight.shadow.camera.right = 10
  dirLight.shadow.camera.top = 10
  dirLight.shadow.camera.bottom = -10
  scene.add(dirLight)

  // 网格地面
  const gridHelper = new THREE.GridHelper(20, 20, 0x334155, 0x1e293b)
  scene.add(gridHelper)

  // 组装平台
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.1, 5),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.5,
      metalness: 0.8
    })
  )
  platform.position.y = -0.05
  platform.receiveShadow = true
  scene.add(platform)

  // 射线检测
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  // 初始化机器人
  robot = new Robot()

  // 窗口自适应
  window.addEventListener('resize', onWindowResize)

  // 动画循环
  animate()
}

function onWindowResize() {
  const container = document.getElementById('canvas-container')
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

// ==================== 拖拽系统 ====================
let draggedPartData = null

function initDragDrop() {
  const partItems = document.querySelectorAll('.part-item')

  partItems.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedPartData = {
        type: item.dataset.type,
        id: item.dataset.id
      }
      item.style.opacity = '0.5'
    })

    item.addEventListener('dragend', (e) => {
      item.style.opacity = '1'
      draggedPartData = null
    })
  })

  const container = document.getElementById('canvas-container')

  container.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  })

  container.addEventListener('drop', (e) => {
    e.preventDefault()
    if (!draggedPartData) return

    // 在鼠标位置创建元件
    const rect = container.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    createPartInScene(draggedPartData)
  })
}

function createPartInScene(data) {
  let partMesh

  if (data.type === 'chassis') partMesh = createChassis(data.id)
  else if (data.type === 'sensor') partMesh = createSensor(data.id)
  else if (data.type === 'actuator') partMesh = createActuator(data.id)
  else if (data.type === 'controller') partMesh = createController(data.id)

  if (partMesh) {
    partMesh.castShadow = true
    partMesh.receiveShadow = true

    // 安装动画：从上方飞入
    partMesh.position.y = 5
    partMesh.scale.set(0.1, 0.1, 0.1)

    robot.addPart(partMesh)

    // 动画
    animatePartInstall(partMesh)
  }
}

function animatePartInstall(mesh) {
  const targetY = mesh.position.y
  const startY = 5
  const duration = 500
  const startTime = Date.now()

  function animate() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic

    mesh.position.y = startY + (targetY - startY) * eased
    mesh.scale.setScalar(0.1 + 0.9 * eased)

    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }
  animate()
}

// ==================== 交互系统 ====================
function initInteraction() {
  const container = document.getElementById('canvas-container')

  container.addEventListener('click', (e) => {
    const rect = container.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(robot.parts, true)

    if (intersects.length > 0) {
      let clickedPart = intersects[0].object
      while (clickedPart.parent && !clickedPart.userData.type) {
        clickedPart = clickedPart.parent
      }
      selectPart(clickedPart)
    } else {
      deselectPart()
    }
  })

  container.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    const rect = container.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(robot.parts, true)

    if (intersects.length > 0) {
      let clickedPart = intersects[0].object
      while (clickedPart.parent && !clickedPart.userData.type) {
        clickedPart = clickedPart.parent
      }
      if (confirm(`删除 ${clickedPart.userData.name}？`)) {
        robot.removePart(clickedPart)
        deselectPart()
      }
    }
  })
}

function selectPart(part) {
  deselectPart()
  selectedPart = part

  // 高亮效果
  part.traverse(child => {
    if (child.isMesh) {
      child.material.emissive = new THREE.Color(0x3b82f6)
      child.material.emissiveIntensity = 0.3
    }
  })

  // 显示属性面板
  showProperties(part)
}

function deselectPart() {
  if (selectedPart) {
    selectedPart.traverse(child => {
      if (child.isMesh) {
        child.material.emissive = new THREE.Color(0x000000)
        child.material.emissiveIntensity = 0
      }
    })
    selectedPart = null
  }
  hideProperties()
}

function showProperties(part) {
  const panel = document.getElementById('properties-panel')
  const title = document.getElementById('prop-part-name')
  const content = document.getElementById('prop-content')

  title.textContent = part.userData.name

  let html = `<div class="prop-item">
    <div class="prop-label">类型</div>
    <div class="prop-value">${part.userData.type}</div>
  </div>`

  Object.entries(part.userData.stats || {}).forEach(([key, value]) => {
    html += `
      <div class="prop-item">
        <div class="prop-label">${key}</div>
        <div class="prop-value">${value}</div>
        <div class="stat-bar">
          <div class="stat-fill" style="width: ${value * 10}%"></div>
        </div>
      </div>
    `
  })

  content.innerHTML = html
  panel.classList.add('active')
}

function hideProperties() {
  document.getElementById('properties-panel').classList.remove('active')
}

// ==================== 工具栏功能 ====================
function updateInfoBar() {
  const text = document.getElementById('info-text')
  const count = robot.parts.length
  const statsList = Object.entries(robot.stats || {})
    .map(([k, v]) => `${k}:${v}`)
    .join(' · ')

  if (count === 0) {
    text.textContent = '💡 拖拽左侧元件到 3D 场景 · 鼠标左键旋转 · 滚轮缩放'
  } else {
    text.textContent = `🤖 已安装 ${count} 个元件 ${statsList ? '· ' + statsList : ''}`
  }
}

document.getElementById('reset-view').addEventListener('click', () => {
  controls.reset()
})

document.getElementById('clear-robot').addEventListener('click', () => {
  if (robot.parts.length === 0) return
  if (confirm('确定清空所有元件？')) {
    robot.clear()
    deselectPart()
  }
})

document.getElementById('save-robot').addEventListener('click', () => {
  if (robot.parts.length === 0) {
    alert('请先添加元件')
    return
  }
  const data = robot.toJSON()
  localStorage.setItem('robot3d_design', JSON.stringify(data))
  alert('✓ 设计已保存')
})

// 自动加载上次设计
function loadSavedDesign() {
  const saved = localStorage.getItem('robot3d_design')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      robot.fromJSON(data)
      console.log('已加载保存的设计')
    } catch (e) {
      console.error('加载设计失败:', e)
    }
  }
}

// ==================== 启动 ====================
init()
initDragDrop()
initInteraction()
loadSavedDesign()

