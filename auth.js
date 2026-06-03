'use strict'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 状态管理
let currentMode = 'login' // 'login' | 'signup' | 'forgot'

// DOM 引用
const pageTitle = document.getElementById('page-title')
const pageSubtitle = document.getElementById('page-subtitle')
const loginForm = document.getElementById('login-form')
const signupForm = document.getElementById('signup-form')
const forgotForm = document.getElementById('forgot-form')
const oauthSection = document.getElementById('oauth-section')
const footerHint = document.getElementById('footer-hint')
const sentNote = document.getElementById('sent-note')

// 切换模式
function switchMode(mode) {
  currentMode = mode
  sentNote.hidden = true

  // 隐藏所有表单
  loginForm.hidden = true
  signupForm.hidden = true
  forgotForm.hidden = true

  // 更新标题和显示对应表单
  if (mode === 'login') {
    pageTitle.textContent = 'RoboNexus'
    pageSubtitle.textContent = '登录机器人控制台'
    loginForm.hidden = false
    oauthSection.hidden = false
    footerHint.innerHTML = '还没有账户？<a href="#" data-switch="signup">立即注册</a>'
  } else if (mode === 'signup') {
    pageTitle.textContent = '创建账户'
    pageSubtitle.textContent = '加入 RoboNexus 机器人控制台'
    signupForm.hidden = false
    oauthSection.hidden = true
    footerHint.innerHTML = '已有账户？<a href="#" data-switch="login">返回登录</a>'
  } else if (mode === 'forgot') {
    pageTitle.textContent = '找回密码'
    pageSubtitle.textContent = '输入邮箱，我们会发送重置链接'
    forgotForm.hidden = false
    oauthSection.hidden = true
    footerHint.innerHTML = '想起来了？<a href="#" data-switch="login">返回登录</a>'
  }
}

// 全局点击监听：切换模式
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-switch]')
  if (target) {
    e.preventDefault()
    switchMode(target.dataset.switch)
  }
})

// 密码显示/隐藏切换
document.querySelectorAll('.pwd-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target
    const input = document.getElementById(targetId)
    const show = input.type === 'password'
    input.type = show ? 'text' : 'password'
    btn.textContent = show ? '隐藏' : '显示'
    btn.setAttribute('aria-label', show ? '隐藏密码' : '显示密码')
  })
})

// 错误提示工具
function setError(input, errorEl, message) {
  errorEl.textContent = message || ''
  if (input) input.classList.toggle('invalid', Boolean(message))
}

// ========== 登录表单 ==========
const loginEmail = document.getElementById('login-email')
const loginPassword = document.getElementById('login-password')
const rememberCheckbox = document.getElementById('remember')
const loginEmailError = document.getElementById('login-email-error')
const loginPasswordError = document.getElementById('login-password-error')

// 记住我：回填上次保存的邮箱
const savedEmail = localStorage.getItem('rn_remember_email')
if (savedEmail) {
  loginEmail.value = savedEmail
  rememberCheckbox.checked = true
}

loginEmail.addEventListener('input', () => setError(loginEmail, loginEmailError, ''))
loginPassword.addEventListener('input', () => setError(loginPassword, loginPasswordError, ''))

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  let ok = true

  const email = loginEmail.value.trim()
  if (!email) {
    setError(loginEmail, loginEmailError, '请输入邮箱')
    ok = false
  } else if (!EMAIL_RE.test(email)) {
    setError(loginEmail, loginEmailError, '邮箱格式不正确')
    ok = false
  } else {
    setError(loginEmail, loginEmailError, '')
  }

  const password = loginPassword.value
  if (!password) {
    setError(loginPassword, loginPasswordError, '请输入密码')
    ok = false
  } else if (password.length < 6) {
    setError(loginPassword, loginPasswordError, '密码至少 6 位')
    ok = false
  } else {
    setError(loginPassword, loginPasswordError, '')
  }

  if (!ok) return

  // 记住我：保存或清除邮箱
  if (rememberCheckbox.checked) {
    localStorage.setItem('rn_remember_email', email)
  } else {
    localStorage.removeItem('rn_remember_email')
  }

  const submitBtn = loginForm.querySelector('.submit-btn')
  submitBtn.disabled = true
  submitBtn.textContent = '登录中…'

  // TODO: 接入真实登录接口
  await new Promise((r) => setTimeout(r, 800))
  console.log('login', { email, password, remember: rememberCheckbox.checked })

  submitBtn.disabled = false
  submitBtn.textContent = '登录'
})

// ========== 注册表单 ==========
const signupName = document.getElementById('signup-name')
const signupEmail = document.getElementById('signup-email')
const signupPassword = document.getElementById('signup-password')
const signupPassword2 = document.getElementById('signup-password2')
const agreeCheckbox = document.getElementById('agree')
const signupNameError = document.getElementById('signup-name-error')
const signupEmailError = document.getElementById('signup-email-error')
const signupPasswordError = document.getElementById('signup-password-error')
const signupPassword2Error = document.getElementById('signup-password2-error')
const agreeError = document.getElementById('agree-error')

signupName.addEventListener('input', () => setError(signupName, signupNameError, ''))
signupEmail.addEventListener('input', () => setError(signupEmail, signupEmailError, ''))
signupPassword.addEventListener('input', () => setError(signupPassword, signupPasswordError, ''))
signupPassword2.addEventListener('input', () => setError(signupPassword2, signupPassword2Error, ''))
agreeCheckbox.addEventListener('change', () => setError(null, agreeError, ''))

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  let ok = true

  const name = signupName.value.trim()
  if (!name) {
    setError(signupName, signupNameError, '请输入用户名')
    ok = false
  } else {
    setError(signupName, signupNameError, '')
  }

  const email = signupEmail.value.trim()
  if (!email) {
    setError(signupEmail, signupEmailError, '请输入邮箱')
    ok = false
  } else if (!EMAIL_RE.test(email)) {
    setError(signupEmail, signupEmailError, '邮箱格式不正确')
    ok = false
  } else {
    setError(signupEmail, signupEmailError, '')
  }

  const password = signupPassword.value
  if (!password) {
    setError(signupPassword, signupPasswordError, '请输入密码')
    ok = false
  } else if (password.length < 6) {
    setError(signupPassword, signupPasswordError, '密码至少 6 位')
    ok = false
  } else {
    setError(signupPassword, signupPasswordError, '')
  }

  const password2 = signupPassword2.value
  if (!password2) {
    setError(signupPassword2, signupPassword2Error, '请再次输入密码')
    ok = false
  } else if (password2 !== password) {
    setError(signupPassword2, signupPassword2Error, '两次输入的密码不一致')
    ok = false
  } else {
    setError(signupPassword2, signupPassword2Error, '')
  }

  if (!agreeCheckbox.checked) {
    setError(null, agreeError, '请先同意服务条款和隐私政策')
    ok = false
  } else {
    setError(null, agreeError, '')
  }

  if (!ok) return

  const submitBtn = signupForm.querySelector('.submit-btn')
  submitBtn.disabled = true
  submitBtn.textContent = '注册中…'

  // TODO: 接入真实注册接口
  await new Promise((r) => setTimeout(r, 800))
  console.log('signup', { name, email, password })

  submitBtn.disabled = false
  submitBtn.textContent = '注册'
})

// ========== 找回密码表单 ==========
const forgotEmail = document.getElementById('forgot-email')
const forgotEmailError = document.getElementById('forgot-email-error')

forgotEmail.addEventListener('input', () => {
  setError(forgotEmail, forgotEmailError, '')
  sentNote.hidden = true
})

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = forgotEmail.value.trim()
  if (!email) {
    setError(forgotEmail, forgotEmailError, '请输入邮箱')
    return
  }
  if (!EMAIL_RE.test(email)) {
    setError(forgotEmail, forgotEmailError, '邮箱格式不正确')
    return
  }
  setError(forgotEmail, forgotEmailError, '')

  const submitBtn = forgotForm.querySelector('.submit-btn')
  submitBtn.disabled = true
  submitBtn.textContent = '发送中…'

  // TODO: 接入真实的重置密码接口
  await new Promise((r) => setTimeout(r, 800))
  console.log('forgot-password', { email })

  // 不论邮箱是否注册都提示同样内容，避免泄露账户是否存在
  sentNote.hidden = false
  submitBtn.disabled = false
  submitBtn.textContent = '发送重置链接'
})

// ========== 第三方登录 ==========
document.querySelectorAll('.oauth-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const provider = btn.dataset.provider
    // TODO: 接入第三方 OAuth 登录
    console.log('oauth', provider)
  })
})
