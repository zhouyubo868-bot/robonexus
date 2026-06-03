'use strict'

// ============================================================
// RoboNexus 机器人零件库
// 数据来源：基于真实人形机器人架构整理
//   - 大脑/小脑分层(VLA、RL步态、MPC、WBC)
//   - 六大子系统(骨架/执行器/传感/电源/计算/软件)
//   - 参考产品：宇树 H1/G1、Tesla Optimus、Figure 02、Atlas、π0、RT-2 等
// 数值为合理估算的相对值，便于属性面板比较，非真实出厂参数。
// ============================================================

// 槽位定义：每台机器人需要装的部件类型
const SLOTS = [
  { id: 'brain',     name: '大脑',     icon: '🧠', desc: '高层决策与语义理解' },
  { id: 'cerebellum',name: '小脑',     icon: '⚡', desc: '运动控制与平衡' },
  { id: 'frame',     name: '骨架',     icon: '🦴', desc: '结构与形态' },
  { id: 'actuator',  name: '执行器',   icon: '💪', desc: '关节驱动' },
  { id: 'sensor',    name: '传感器',   icon: '👁️', desc: '感知套件' },
  { id: 'power',     name: '电源',     icon: '🔋', desc: '供电与续航' },
]

// 零件库：每个零件含完整属性
// 属性单位：
//   compute  TOPS       算力(每秒万亿次运算)
//   power    W          运行功耗
//   weight   kg         重量
//   cost     ¥          估算成本(人民币万元单位的整数倍：1=1万)
//   dof      个         自由度(仅执行器/骨架)
//   battery  Wh         电池容量(仅电源)
//   skills   string[]   赋予机器人的能力标签
const PARTS = {
  // ================= 大脑 (Brain) =================
  brain: [
    {
      id: 'brain-vla-pi0', name: 'π0 端到端 VLA',
      tier: 'flagship',
      desc: '视觉-语言-动作端到端模型，可直接从摄像头输入生成动作。Physical Intelligence 路线。',
      stats: { compute: 60, power: 80, weight: 0.8, cost: 18, intelligence: 95, perception: 70 },
      skills: ['自然语言指令', '零样本任务', '工具使用', '长程规划'],
      requires: { sensor: ['vision'] },
    },
    {
      id: 'brain-vlm-rt2', name: 'RT-2 视觉语言模型',
      tier: 'high',
      desc: 'Google DeepMind 路线，VLM 输出离散动作 token。强在语义理解。',
      stats: { compute: 50, power: 70, weight: 0.7, cost: 14, intelligence: 88, perception: 65 },
      skills: ['自然语言指令', '物体识别', '常识推理'],
      requires: { sensor: ['vision'] },
    },
    {
      id: 'brain-llm-edge', name: '边缘大语言模型',
      tier: 'mid',
      desc: '7B 量化 LLM 跑在 Jetson，负责对话与任务分解，动作交给小脑。',
      stats: { compute: 30, power: 40, weight: 0.5, cost: 6, intelligence: 75, perception: 30 },
      skills: ['自然语言对话', '任务分解'],
    },
    {
      id: 'brain-classic', name: '经典规划器',
      tier: 'basic',
      desc: '基于行为树+状态机，规则明确无幻觉，但只能做预设任务。',
      stats: { compute: 5, power: 8, weight: 0.2, cost: 1, intelligence: 35, perception: 20 },
      skills: ['预设任务执行'],
    },
  ],

  // ================= 小脑 (Cerebellum) =================
  cerebellum: [
    {
      id: 'cere-rl-wbc', name: 'RL + 全身控制 WBC',
      tier: 'flagship',
      desc: '强化学习步态策略 + 全身控制器，1kHz 闭环。能跑能跳能后空翻。',
      stats: { compute: 15, power: 25, weight: 0.3, cost: 8, mobility: 95, stability: 92 },
      skills: ['动态行走', '跳跃', '抗扰动', '复杂地形'],
      requires: { sensor: ['imu'], actuator: ['high-torque'] },
    },
    {
      id: 'cere-mpc', name: 'MPC 模型预测控制',
      tier: 'high',
      desc: '基于动力学模型的预测控制，500Hz。稳定可解释，调试友好。',
      stats: { compute: 10, power: 18, weight: 0.25, cost: 5, mobility: 80, stability: 88 },
      skills: ['平稳行走', '负重行走', '楼梯'],
      requires: { sensor: ['imu'] },
    },
    {
      id: 'cere-zmp', name: 'ZMP 零力矩点控制',
      tier: 'mid',
      desc: '经典双足平衡算法。低算力即可运行，但只能在平地慢走。',
      stats: { compute: 3, power: 6, weight: 0.15, cost: 2, mobility: 55, stability: 70 },
      skills: ['平地行走'],
      requires: { sensor: ['imu'] },
    },
    {
      id: 'cere-pid', name: 'PID 关节控制',
      tier: 'basic',
      desc: '最基础的关节级 PID。每个关节独立控制，无全身协调。',
      stats: { compute: 1, power: 3, weight: 0.1, cost: 0.5, mobility: 30, stability: 40 },
      skills: ['静态站立', '单关节运动'],
    },
  ],

  // ================= 骨架 (Frame) =================
  frame: [
    {
      id: 'frame-humanoid-cf', name: '人形碳纤维骨架',
      tier: 'flagship',
      desc: '碳纤维一体成型，27 自由度全人形结构。轻量高刚性。',
      stats: { weight: 18, cost: 12, dof: 27, durability: 90 },
      form: 'humanoid',
      skills: ['双足行走', '双臂操作', '灵巧手'],
    },
    {
      id: 'frame-humanoid-al', name: '人形铝合金骨架',
      tier: 'high',
      desc: '6061/7075 铝合金 CNC，23 自由度。性价比之选，宇树 G1 路线。',
      stats: { weight: 28, cost: 5, dof: 23, durability: 80 },
      form: 'humanoid',
      skills: ['双足行走', '双臂操作'],
    },
    {
      id: 'frame-quadruped', name: '四足骨架',
      tier: 'high',
      desc: '12 自由度四足平台，越野能力强。Spot/B2 路线。',
      stats: { weight: 22, cost: 4, dof: 12, durability: 88 },
      form: 'quadruped',
      skills: ['四足行走', '越野', '负重'],
    },
    {
      id: 'frame-wheeled', name: '轮式底盘',
      tier: 'mid',
      desc: '差速驱动轮式底盘 + 单臂。室内服务机器人常见形态。',
      stats: { weight: 15, cost: 2, dof: 8, durability: 75 },
      form: 'wheeled',
      skills: ['平面移动', '单臂操作'],
    },
    {
      id: 'frame-arm', name: '固定式机械臂',
      tier: 'mid',
      desc: '6 轴桌面机械臂，无移动能力，只做精密操作。',
      stats: { weight: 8, cost: 1.5, dof: 6, durability: 85 },
      form: 'arm',
      skills: ['精密操作', '装配'],
    },
  ],

  // ================= 执行器 (Actuator) =================
  actuator: [
    {
      id: 'act-bldc-harmonic', name: '无刷电机 + 谐波减速',
      tier: 'flagship',
      desc: '高扭矩密度无刷电机配谐波减速器。宇树 H1、Figure 02 同款方案。',
      stats: { power: 150, weight: 6, cost: 10, torque: 95, speed: 90 },
      tags: ['high-torque'],
      skills: ['爆发动作', '负重'],
    },
    {
      id: 'act-qdd', name: '准直驱电机 (QDD)',
      tier: 'high',
      desc: '低减速比直驱，反向可驱动性好，落地冲击能量回收。',
      stats: { power: 120, weight: 5, cost: 8, torque: 75, speed: 95 },
      tags: ['high-torque'],
      skills: ['动态步态', '冲击吸收'],
    },
    {
      id: 'act-servo', name: 'Dynamixel 数字舵机',
      tier: 'mid',
      desc: 'MX-106 级数字舵机，约 8 Nm。教育平台 Darwin-OP 同款。',
      stats: { power: 60, weight: 3, cost: 2, torque: 40, speed: 50 },
      tags: [],
      skills: ['基础动作'],
    },
    {
      id: 'act-hydraulic', name: '液压执行器',
      tier: 'high',
      desc: '高功率密度，6 kN 级。早期 Atlas 同款，但需液压泵。',
      stats: { power: 400, weight: 12, cost: 15, torque: 100, speed: 80 },
      tags: ['high-torque'],
      skills: ['超高负重', '极限动作'],
    },
  ],

  // ================= 传感器 (Sensor) =================
  sensor: [
    {
      id: 'sensor-full', name: '全感知套件',
      tier: 'flagship',
      desc: 'IMU + 双目RGB + LiDAR + 力矩 + 触觉阵列。π0/RT-2 类大脑必备。',
      stats: { power: 35, weight: 1.8, cost: 8, perception: 95 },
      tags: ['imu', 'vision', 'lidar', 'tactile', 'force'],
      skills: ['深度感知', '建图导航', '触觉操作', '人体姿态识别'],
    },
    {
      id: 'sensor-vision-imu', name: '视觉 + IMU',
      tier: 'high',
      desc: '双目 RGB-D (RealSense/ZED) + 9 轴 IMU。绝大多数任务的主力配置。',
      stats: { power: 18, weight: 0.9, cost: 3, perception: 75 },
      tags: ['imu', 'vision', 'force'],
      skills: ['深度感知', '物体识别', '基础导航'],
    },
    {
      id: 'sensor-imu-only', name: '基础 IMU',
      tier: 'mid',
      desc: '6 轴 IMU + 关节编码器。够小脑闭环用,没有外部感知。',
      stats: { power: 4, weight: 0.2, cost: 0.3, perception: 20 },
      tags: ['imu'],
      skills: ['平衡感知'],
    },
    {
      id: 'sensor-lidar', name: 'LiDAR 套件',
      tier: 'high',
      desc: '机械式或固态 LiDAR + IMU。建图与避障第一档,室外强项。',
      stats: { power: 22, weight: 1.1, cost: 4, perception: 80 },
      tags: ['imu', 'lidar', 'force'],
      skills: ['SLAM 建图', '远距避障', '点云感知'],
    },
  ],

  // ================= 电源 (Power) =================
  power: [
    {
      id: 'power-2kwh', name: '2kWh 锂电池组 + BMS',
      tier: 'flagship',
      desc: '48V 高密度锂离子电池，带 BMS。Digit 级续航(~4h)。',
      stats: { battery: 2000, weight: 14, cost: 4, voltage: 48 },
      skills: ['长时间续航'],
    },
    {
      id: 'power-1kwh', name: '1kWh 锂电池组',
      tier: 'high',
      desc: '48V 标配电池组。电动 Atlas 量级(~1h)。',
      stats: { battery: 1000, weight: 8, cost: 2, voltage: 48 },
      skills: [],
    },
    {
      id: 'power-500wh', name: '500Wh 紧凑电池',
      tier: 'mid',
      desc: '24V 轻量电池，适合小型平台或室内短任务。',
      stats: { battery: 500, weight: 4, cost: 1, voltage: 24 },
      skills: [],
    },
    {
      id: 'power-tether', name: '外接电源(系绳)',
      tier: 'basic',
      desc: '靠电缆供电，无电池重量负担，但不能自由移动。',
      stats: { battery: 9999, weight: 0.5, cost: 0.2, voltage: 48 },
      skills: ['无限续航(系绳)'],
    },
  ],
}

// 兼容性规则：返回 [{level: 'error'|'warn'|'info', message}]
function checkCompatibility(build) {
  const issues = []

  // 1) 必填检查
  for (const slot of SLOTS) {
    if (!build[slot.id]) {
      issues.push({ level: 'error', message: `缺少${slot.name}` })
    }
  }
  if (issues.length) return issues

  // 2) 大脑依赖
  const brain = build.brain
  if (brain.requires?.sensor) {
    const sensorTags = build.sensor.tags || []
    for (const need of brain.requires.sensor) {
      if (!sensorTags.includes(need)) {
        issues.push({ level: 'error', message: `${brain.name}需要传感器具备「${need}」能力` })
      }
    }
  }

  // 3) 小脑依赖
  const cere = build.cerebellum
  if (cere.requires?.sensor) {
    const sensorTags = build.sensor.tags || []
    for (const need of cere.requires.sensor) {
      if (!sensorTags.includes(need)) {
        issues.push({ level: 'error', message: `${cere.name}需要传感器具备「${need}」` })
      }
    }
  }
  if (cere.requires?.actuator) {
    const actTags = build.actuator.tags || []
    for (const need of cere.requires.actuator) {
      if (!actTags.includes(need)) {
        issues.push({ level: 'warn', message: `${cere.name}建议搭配「${need}」执行器以发挥全部性能` })
      }
    }
  }

  // 4) 功率预算
  const totalPower = (brain.stats.power || 0) + (cere.stats.power || 0) +
                     (build.actuator.stats.power || 0) + (build.sensor.stats.power || 0)
  const battery = build.power.stats.battery || 0
  const runtimeH = battery / totalPower
  if (runtimeH < 0.3) {
    issues.push({ level: 'warn', message: `续航不足 20 分钟,建议升级电源或降低功耗` })
  }

  // 5) 形态匹配
  if (build.frame.form === 'arm' && cere.id !== 'cere-pid' && cere.id !== 'cere-mpc') {
    issues.push({ level: 'info', message: `固定机械臂用不到行走类小脑算法` })
  }
  if (build.frame.form === 'wheeled' && build.actuator.id === 'act-hydraulic') {
    issues.push({ level: 'warn', message: `轮式底盘搭配液压执行器属于过度配置` })
  }

  return issues
}

// 计算综合属性 (build 必须每槽位都有)
function computeStats(build) {
  if (!Object.keys(build).length || SLOTS.some((s) => !build[s.id])) return null

  // 算力总和
  const compute = (build.brain.stats.compute || 0) + (build.cerebellum.stats.compute || 0)

  // 总功耗
  const power = (build.brain.stats.power || 0) + (build.cerebellum.stats.power || 0) +
                (build.actuator.stats.power || 0) + (build.sensor.stats.power || 0)

  // 总重量
  const weight = SLOTS.reduce((sum, s) => sum + (build[s.id].stats.weight || 0), 0)

  // 总成本(万元)
  const cost = SLOTS.reduce((sum, s) => sum + (build[s.id].stats.cost || 0), 0)

  // 续航(小时)
  const battery = build.power.stats.battery || 0
  const runtime = power > 0 ? battery / power : 0

  // 自由度
  const dof = build.frame.stats.dof || 0

  // 综合评分(0-100)
  const intelligence = Math.min(100, (build.brain.stats.intelligence || 0))
  const mobility = Math.min(100,
    (build.cerebellum.stats.mobility || 0) * 0.5 +
    (build.actuator.stats.torque || 0) * 0.3 +
    (build.actuator.stats.speed || 0) * 0.2
  )
  const perception = Math.min(100,
    (build.sensor.stats.perception || 0) * 0.7 +
    (build.brain.stats.perception || 0) * 0.3
  )
  const stability = Math.min(100,
    (build.cerebellum.stats.stability || 0) * 0.7 +
    (build.frame.stats.durability || 0) * 0.3
  )

  // 汇总技能列表(去重)
  const skills = new Set()
  for (const s of SLOTS) {
    for (const sk of build[s.id].skills || []) skills.add(sk)
  }

  return {
    compute, power, weight, cost, runtime, dof,
    intelligence, mobility, perception, stability,
    skills: [...skills],
    form: build.frame.form,
  }
}

window.RobotParts = { SLOTS, PARTS, checkCompatibility, computeStats }
