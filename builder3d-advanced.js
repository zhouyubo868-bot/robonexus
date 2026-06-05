import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ==================== 全局状态 ====================
let scene, camera, renderer, controls, raycaster, mouse
let currentTool = 'hand'
let installedParts = []
let ghostPart = null // 拖拽时的半透明预览
let snapPoints = [] // 吸附点标记
let totalParts = 10
let completedParts = 0

// ==================== 零件定义（细化版）====================
const PART_SPECS = {
  'chassis-frame': {
    name: '底盘框架',
    create: () => {
      const group = new THREE.Group()
      // 主框架
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.15, 2),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 })
      )
      group.add(frame)

      // 4个轮子安装孔
      const holeGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.16, 16)
      const holeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b })
      const holePositions = [
        [0.6, 0, 0.8], [0.6, 0, -0.8], [-0.6, 0, 0.8], [-0.6, 0, -0.8]
      ]
      holePositions.forEach(([x, y, z], i) => {
        const hole = new THREE.Mesh(holeGeom, holeMat)
        hole.position.set(x, y, z)
        hole.rotation.x = Math.PI / 2
        hole.userData = { type: 'snap-point', for: 'wheel', index: i }
        group.add(hole)
      })

      group.userData = { partType: 'chassis-frame', snapPoints: holePositions }
      return group
    },
    snapTo: null // 第一个零件，不需要吸附
  },

  // ========== 底盘附件（4 种配件增强结构）==========
  'bumper-front': {
    name: '前保险杠',
    desc: '安装到底盘前端',
    category: 'chassis',
    create: () => {
      const group = new THREE.Group()
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.08, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 })
      )
      bar.position.z = 1.06
      group.add(bar)
      // 缓冲橡胶条
      const rubber = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.05, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 })
      )
      rubber.position.set(0, 0, 1.12)
      group.add(rubber)
      // 2个固定螺丝
      for (let x of [-0.6, 0.6]) {
        const screw = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.03, 8),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.3 })
        )
        screw.position.set(x, 0.04, 1.06)
        screw.userData = { type: 'screw-point', tightened: false }
        group.add(screw)
      }
      group.userData = { partType: 'bumper-front', needsScrews: 2, screwsTightened: 0 }
      return group
    },
    snapTo: 'chassis-frame',
    snapDistance: 0.35
  },

  'bumper-rear': {
    name: '后保险杠',
    desc: '安装到底盘后端',
    category: 'chassis',
    create: () => {
      const group = new THREE.Group()
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.08, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 })
      )
      bar.position.z = -1.06
      group.add(bar)
      const rubber = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.05, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 })
      )
      rubber.position.set(0, 0, -1.12)
      group.add(rubber)
      for (let x of [-0.6, 0.6]) {
        const screw = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.03, 8),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.3 })
        )
        screw.position.set(x, 0.04, -1.06)
        screw.userData = { type: 'screw-point', tightened: false }
        group.add(screw)
      }
      group.userData = { partType: 'bumper-rear', needsScrews: 2, screwsTightened: 0 }
      return group
    },
    snapTo: 'chassis-frame',
    snapDistance: 0.35
  },

  'side-plate-left': {
    name: '左侧护板',
    desc: '加强侧面结构',
    category: 'chassis',
    create: () => {
      const group = new THREE.Group()
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.2, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.3 })
      )
      plate.position.x = 0.79
      plate.position.y = 0.025
      group.add(plate)
      // 散热孔（装饰）
      for (let z = -0.6; z <= 0.6; z += 0.3) {
        const hole = new THREE.Mesh(
          new THREE.CircleGeometry(0.04, 12),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
        )
        hole.position.set(0.8, 0.025, z)
        hole.rotation.y = Math.PI / 2
        group.add(hole)
      }
      for (let z of [-0.7, 0.7]) {
        const screw = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.025, 8),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.3 })
        )
        screw.position.set(0.79, 0.1, z)
        screw.userData = { type: 'screw-point', tightened: false }
        group.add(screw)
      }
      group.userData = { partType: 'side-plate-left', needsScrews: 2, screwsTightened: 0 }
      return group
    },
    snapTo: 'chassis-frame',
    snapDistance: 0.3
  },

  'side-plate-right': {
    name: '右侧护板',
    desc: '加强侧面结构',
    category: 'chassis',
    create: () => {
      const group = new THREE.Group()
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.2, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.3 })
      )
      plate.position.x = -0.79
      plate.position.y = 0.025
      group.add(plate)
      for (let z = -0.6; z <= 0.6; z += 0.3) {
        const hole = new THREE.Mesh(
          new THREE.CircleGeometry(0.04, 12),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
        )
        hole.position.set(-0.8, 0.025, z)
        hole.rotation.y = Math.PI / 2
        group.add(hole)
      }
      for (let z of [-0.7, 0.7]) {
        const screw = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.025, 8),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.3 })
        )
        screw.position.set(-0.79, 0.1, z)
        screw.userData = { type: 'screw-point', tightened: false }
        group.add(screw)
      }
      group.userData = { partType: 'side-plate-right', needsScrews: 2, screwsTightened: 0 }
      return group
    },
    snapTo: 'chassis-frame',
    snapDistance: 0.3
  },

  // ========== 轮子组件（6 个子零件，需按顺序组装）==========
  // 组装链:chassis-frame → hub → bearing → axle → tire → cap (4 颗螺丝)
  'hub': {
    name: '轮毂',
    desc: '吸附到底盘 4 个安装孔之一',
    category: 'wheel',
    create: () => {
      const group = new THREE.Group()
      // 主体:轮辐圆环
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.04, 12, 24),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 })
      )
      rim.rotation.y = Math.PI / 2
      group.add(rim)
      // 5 根辐条
      for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.025, 0.32, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 })
        )
        spoke.rotation.x = (i / 5) * Math.PI
        group.add(spoke)
      }
      // 中心孔标记(用于轴承吸附)
      const centerHole = new THREE.Mesh(
        new THREE.CircleGeometry(0.05, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
      )
      centerHole.rotation.y = Math.PI / 2
      group.add(centerHole)

      group.userData = {
        partType: 'hub',
        snapPoints: [[0, 0, 0]] // 中心点供轴承吸附
      }
      return group
    },
    snapTo: 'chassis-frame',
    snapDistance: 0.3
  },

  'bearing': {
    name: '轴承',
    desc: '装入轮毂中心孔',
    category: 'wheel',
    create: () => {
      const group = new THREE.Group()
      // 外圈
      const outer = new THREE.Mesh(
        new THREE.TorusGeometry(0.05, 0.012, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.15 })
      )
      outer.rotation.y = Math.PI / 2
      group.add(outer)
      // 内圈
      const inner = new THREE.Mesh(
        new THREE.TorusGeometry(0.025, 0.008, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.95 })
      )
      inner.rotation.y = Math.PI / 2
      group.add(inner)

      group.userData = {
        partType: 'bearing',
        snapPoints: [[0, 0, 0]]
      }
      return group
    },
    snapTo: 'hub',
    snapDistance: 0.15
  },

  'axle': {
    name: '轴心',
    desc: '穿过轴承固定轮毂',
    category: 'wheel',
    create: () => {
      const group = new THREE.Group()
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.18, 12),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.95, roughness: 0.1 })
      )
      rod.rotation.z = Math.PI / 2
      group.add(rod)
      // 两端凸缘
      const flangeMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
      const f1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.015, 12), flangeMat)
      f1.rotation.z = Math.PI / 2
      f1.position.x = 0.085
      group.add(f1)
      const f2 = f1.clone()
      f2.position.x = -0.085
      group.add(f2)

      group.userData = {
        partType: 'axle',
        snapPoints: [[0, 0, 0]]
      }
      return group
    },
    snapTo: 'bearing',
    snapDistance: 0.15
  },

  'tire': {
    name: '轮胎',
    desc: '橡胶外胎,套在轮毂外侧',
    category: 'wheel',
    create: () => {
      const group = new THREE.Group()
      // 橡胶圈
      const rubber = new THREE.Mesh(
        new THREE.TorusGeometry(0.21, 0.06, 16, 32),
        new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.05, roughness: 0.95 })
      )
      rubber.rotation.y = Math.PI / 2
      group.add(rubber)
      // 胎面纹路(几条凸起小盒子)
      for (let i = 0; i < 12; i++) {
        const tread = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.04, 0.05),
          new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 1 })
        )
        const a = (i / 12) * Math.PI * 2
        tread.position.set(0, Math.cos(a) * 0.245, Math.sin(a) * 0.245)
        tread.rotation.x = a
        group.add(tread)
      }
      // 4 个螺丝孔(供 wheel-screw 吸附)
      const screwPositions = []
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        screwPositions.push([0.06, Math.cos(a) * 0.13, Math.sin(a) * 0.13])
      }

      group.userData = {
        partType: 'tire',
        snapPoints: screwPositions
      }
      return group
    },
    snapTo: 'axle',
    snapDistance: 0.18
  },

  'wheel-screw': {
    name: '轮胎螺丝',
    desc: '4 颗螺丝固定轮胎',
    category: 'wheel',
    create: () => {
      const group = new THREE.Group()
      // 螺丝头(六角)
      const head = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.012, 6),
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          metalness: 0.85,
          emissive: 0xfbbf24,
          emissiveIntensity: 0.3
        })
      )
      head.rotation.z = Math.PI / 2
      head.userData = { type: 'screw-point', tightened: false }
      group.add(head)
      // 螺杆
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.025, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
      )
      shaft.rotation.z = Math.PI / 2
      shaft.position.x = -0.018
      group.add(shaft)

      group.userData = {
        partType: 'wheel-screw',
        needsScrews: 1,
        screwsTightened: 0
      }
      return group
    },
    snapTo: 'tire',
    snapDistance: 0.1
  },

  'wheel-cap': {
    name: '轮盖',
    desc: '装饰性中心盖,完成轮子组装',
    category: 'wheel',
    create: () => {
      const group = new THREE.Group()
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          metalness: 0.9,
          roughness: 0.1,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.15
        })
      )
      cap.rotation.z = -Math.PI / 2
      group.add(cap)
      // 中心 logo 圆点
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(0.02, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      )
      dot.rotation.y = Math.PI / 2
      dot.position.x = 0.001
      group.add(dot)

      group.userData = { partType: 'wheel-cap' }
      return group
    },
    snapTo: 'tire',
    snapDistance: 0.1
  },

  // ========== 兼容老版本 wheel(整体轮子,留作快速搭建用) ==========
  'wheel': {
    name: '轮子(整体)',
    desc: '快速模式:一次安装整个轮子',
    category: 'wheel',
    create: () => {
      const group = new THREE.Group()
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.12, 20),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.6 })
      )
      wheel.rotation.z = Math.PI / 2
      group.add(wheel)

      // 中心轴
      const axle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.15, 12),
        new THREE.MeshStandardMaterial({ color: 0x64748b })
      )
      axle.rotation.z = Math.PI / 2
      group.add(axle)

      // 螺丝孔标记（4个小圆柱）
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2
        const screw = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8),
          new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            emissive: 0xfbbf24,
            emissiveIntensity: 0.3
          })
        )
        screw.position.set(Math.cos(angle) * 0.15, Math.sin(angle) * 0.15, 0.08)
        screw.userData = { type: 'screw-point', tightened: false }
        group.add(screw)
      }

      group.userData = { partType: 'wheel', needsScrews: 4, screwsTightened: 0 }
      return group
    },
    snapTo: 'chassis-frame',
    snapDistance: 0.3
  },

  'motor': {
    name: '电机',
    create: () => {
      const group = new THREE.Group()
      const motor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8, roughness: 0.2 })
      )
      group.add(motor)

      // 电线接口
      const wire = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      )
      wire.position.set(0, 0.12, 0)
      group.add(wire)

      group.userData = { partType: 'motor', needsWiring: true, wired: false }
      return group
    },
    snapTo: 'wheel',
    snapDistance: 0.25
  },

  'sensor-mount': {
    name: '传感器支架',
    create: () => {
      const group = new THREE.Group()
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.8, 12),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 })
      )
      pole.position.y = 0.4
      group.add(pole)

      const mount = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.1, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x475569 })
      )
      mount.position.y = 0.8
      group.add(mount)

      group.userData = { partType: 'sensor-mount' }
      return group
    },
    snapTo: 'chassis-frame',
    snapDistance: 0.4
  },

  'camera': {
    name: '视觉相机',
    create: () => {
      const group = new THREE.Group()
      const lens = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.5, roughness: 0.3 })
      )
      group.add(lens)

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      )
      body.position.y = -0.15
      group.add(body)

      group.userData = { partType: 'camera' }
      return group
    },
    snapTo: 'sensor-mount',
    snapDistance: 0.2
  },

  'controller': {
    name: '主控芯片',
    create: () => {
      const group = new THREE.Group()
      const chip = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.12, 0.5),
        new THREE.MeshStandardMaterial({
          color: 0xa855f7,
          metalness: 0.9,
          emissive: 0xa855f7,
          emissiveIntensity: 0.3
        })
      )
      group.add(chip)

      // 电路纹理（简化）
      for (let i = 0; i < 8; i++) {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 0.13, 0.3),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24 })
        )
        line.position.x = -0.2 + (i * 0.06)
        group.add(line)
      }

      group.userData = { partType: 'controller' }
      return group
    },
    snapTo: 'chassis-frame',
    snapDistance: 0.3
  },

  'battery': {
    name: '电池组',
    create: () => {
      const group = new THREE.Group()
      const battery = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.2, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, metalness: 0.6 })
      )
      group.add(battery)

      // 电极
      const positive = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      )
      positive.position.set(0.15, 0.13, 0)
      group.add(positive)

      const negative = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      )
      negative.position.set(-0.15, 0.13, 0)
      group.add(negative)

      group.userData = { partType: 'battery' }
      return group
    },
    snapTo: 'chassis-frame',
    snapDistance: 0.3
  }
}

// ==================== 场景初始化 ====================
function init() {
  const container = document.getElementById('canvas-container')

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0e1a)
  scene.fog = new THREE.Fog(0x0a0e1a, 15, 50)

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000)
  camera.position.set(4, 4, 6)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.maxDistance = 15
  controls.minDistance = 2
  controls.maxPolarAngle = Math.PI / 2.2

  // 光照
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1)
  dirLight.position.set(8, 10, 6)
  dirLight.castShadow = true
  dirLight.shadow.camera.near = 0.1
  dirLight.shadow.camera.far = 50
  dirLight.shadow.camera.left = -8
  dirLight.shadow.camera.right = 8
  dirLight.shadow.camera.top = 8
  dirLight.shadow.camera.bottom = -8
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  scene.add(dirLight)

  // 地面
  const gridHelper = new THREE.GridHelper(20, 20, 0x334155, 0x1e293b)
  scene.add(gridHelper)

  // 组装平台（带标记）
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.05, 3),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2
    })
  )
  platform.position.y = -0.025
  platform.receiveShadow = true
  scene.add(platform)

  // 射线检测
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  window.addEventListener('resize', onWindowResize)
  animate()
}

function onWindowResize() {
  const container = document.getElementById('canvas-container')
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // 未固定零件的抖动提示
  installedParts.forEach(part => {
    if (part.userData.needsScrews && part.userData.screwsTightened < part.userData.needsScrews) {
      part.position.y = (part._baseY ?? part.position.y) + Math.sin(t * 8) * 0.01
      if (part._baseY === undefined) part._baseY = part.position.y
    }
  })

  controls.update()
  renderer.render(scene, camera)
}

// ==================== 拖拽系统 ====================
let draggedPartType = null

function initDragDrop() {
  const partItems = document.querySelectorAll('.part-item')

  partItems.forEach(item => {
    item.setAttribute('draggable', 'true')

    item.addEventListener('dragstart', (e) => {
      if (item.classList.contains('installed')) {
        e.preventDefault()
        return
      }
      draggedPartType = item.dataset.type
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'copy'
        e.dataTransfer.setData('text/plain', draggedPartType)
      }
      item.style.opacity = '0.5'
      console.log('开始拖拽:', draggedPartType)
    })

    item.addEventListener('dragend', () => {
      item.style.opacity = '1'
      if (ghostPart) {
        scene.remove(ghostPart)
        ghostPart = null
      }
      draggedPartType = null
    })
  })

  const container = document.getElementById('canvas-container')

  container.addEventListener('dragover', (e) => {
    e.preventDefault()
    if (!draggedPartType) return

    // 显示半透明预览
    const rect = container.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(scene.children, true)

    if (intersects.length > 0) {
      const point = intersects[0].point

      if (!ghostPart || ghostPart.userData.partType !== draggedPartType) {
        if (ghostPart) scene.remove(ghostPart)
        ghostPart = PART_SPECS[draggedPartType].create()
        ghostPart.traverse(child => {
          if (child.isMesh) {
            child.material = child.material.clone()
            child.material.transparent = true
            child.material.opacity = 0.5
          }
        })
        scene.add(ghostPart)
      }

      // 吸附检测
      const spec = PART_SPECS[draggedPartType]
      let snapped = false

      if (spec.snapTo) {
        const targetParts = installedParts.filter(p => p.userData.partType === spec.snapTo)

        for (const target of targetParts) {
          if (target.userData.snapPoints) {
            for (let i = 0; i < target.userData.snapPoints.length; i++) {
              const snapPos = target.userData.snapPoints[i]
              const worldPos = new THREE.Vector3(...snapPos).add(target.position)

              if (point.distanceTo(worldPos) < spec.snapDistance) {
                ghostPart.position.copy(worldPos)
                ghostPart.userData.snapTarget = { part: target, index: i }
                snapped = true

                // 高亮吸附点
                ghostPart.traverse(child => {
                  if (child.isMesh) {
                    child.material.opacity = 0.8
                    child.material.emissive = new THREE.Color(0x3b82f6)
                    child.material.emissiveIntensity = 0.3
                  }
                })
                break
              }
            }
          }
          if (snapped) break
        }
      }

      if (!snapped) {
        ghostPart.position.copy(point)
        ghostPart.userData.snapTarget = null
        ghostPart.traverse(child => {
          if (child.isMesh) {
            child.material.opacity = 0.5
            child.material.emissive = new THREE.Color(0x000000)
            child.material.emissiveIntensity = 0
          }
        })
      }
    }
  })

  container.addEventListener('drop', (e) => {
    e.preventDefault()
    if (!draggedPartType || !ghostPart) return

    console.log('放置零件:', draggedPartType)

    // 创建真实零件
    const part = PART_SPECS[draggedPartType].create()
    part.position.copy(ghostPart.position)
    part.userData.snapTarget = ghostPart.userData.snapTarget
    part.castShadow = true
    part.receiveShadow = true

    scene.add(part)
    installedParts.push(part)

    // 标记为已安装
    const item = document.querySelector(`.part-item[data-type="${draggedPartType}"]`)
    if (item) {
      item.classList.add('installed')
      item.querySelector('.part-status').textContent = '✓ 已放置'
    }

    // 清理预览
    scene.remove(ghostPart)
    ghostPart = null
    draggedPartType = null

    updateProgress()
    updateHint()
  })
}

// ==================== 工具系统 ====================
function initTools() {
  const toolBtns = document.querySelectorAll('.tool-btn')

  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toolBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      currentTool = btn.dataset.tool
      console.log('切换工具:', currentTool)
      updateHint()
    })
  })
}

function initInteraction() {
  const container = document.getElementById('canvas-container')

  container.addEventListener('click', (e) => {
    const rect = container.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(installedParts, true)

    if (intersects.length > 0) {
      let clickedObj = intersects[0].object

      // 找到顶层 part group
      while (clickedObj.parent && !clickedObj.userData.partType) {
        clickedObj = clickedObj.parent
      }

      handleToolAction(clickedObj, intersects[0].object)
    }
  })
}

function handleToolAction(part, clickedMesh) {
  if (currentTool === 'screwdriver') {
    // 螺丝刀：拧紧螺丝
    if (clickedMesh.userData.type === 'screw-point') {
      if (clickedMesh.userData.tightened) {
        console.log('螺丝已拧紧')
        return
      }

      console.log('拧紧螺丝...')

      // 螺丝旋转动画
      animateScrewTighten(clickedMesh, () => {
        clickedMesh.userData.tightened = true
        clickedMesh.material.emissive = new THREE.Color(0x22c55e)
        clickedMesh.material.emissiveIntensity = 0.5

        part.userData.screwsTightened++

        if (part.userData.screwsTightened >= part.userData.needsScrews) {
          console.log('零件固定完成:', part.userData.partType)
          part._baseY = part.position.y // 停止抖动
          completedParts++
          updateProgress()
        }
      })
    } else {
      console.log('这里没有螺丝')
    }
  } else if (currentTool === 'wrench') {
    console.log('扳手工具 - 调整角度（开发中）')
  } else if (currentTool === 'test') {
    console.log('测试模式（开发中）')
  }
}

function animateScrewTighten(screwMesh, onComplete) {
  const duration = 800
  const startTime = Date.now()
  const startRotation = screwMesh.rotation.z

  function animate() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)

    screwMesh.rotation.z = startRotation + progress * Math.PI * 4 // 旋转2圈
    screwMesh.position.z -= 0.00008 // 逐渐拧入

    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      onComplete()
    }
  }
  animate()
}

// ==================== UI 更新 ====================
function updateProgress() {
  const progress = Math.round((completedParts / totalParts) * 100)
  document.getElementById('progress-fill').style.width = `${progress}%`
  document.getElementById('progress-text').textContent = `${completedParts}/${totalParts}`
}

function updateHint() {
  const hints = {
    hand: '拖拽左侧零件到场景 · 鼠标左键旋转视角',
    screwdriver: '点击黄色螺丝孔固定零件 · 未固定的零件会抖动',
    wrench: '点击关节调整角度（开发中）',
    test: '启动机器人测试（开发中）'
  }
  document.getElementById('hint-box').textContent = hints[currentTool] || ''
}

// ==================== 启动 ====================
init()
initDragDrop()
initTools()
initInteraction()
updateHint()

console.log('真实组装模式已加载')
console.log('可用零件:', Object.keys(PART_SPECS))

