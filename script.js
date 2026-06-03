'use strict'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const form = document.getElementById('login-form')
const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const rememberInput = document.getElementById('remember')
const submitBtn = document.getElementById('submit-btn')
const pwdToggle = document.getElementById('pwd-toggle')
const emailError = document.getElementById('email-error')
const passwordError = document.getElementById('password-error')

// 记住我：回填上次保存的邮箱
const savedEmail = localStorage.getItem('rn_remember_email')
if (savedEmail) {
  emailInput.value = savedEmail
  rememberInput.checked = true
}

// 显示 / 隐藏密码
pwdToggle.addEventListener('click', () => {
  const show = passwordInput.type === 'password'
  passwordInput.type = show ? 'text' : 'password'
  pwdToggle.textContent = show ? '隐藏' : '显示'
  pwdToggle.setAttribute('aria-label', show ? '隐藏密码' : '显示密码')
})

function setError(input, errorEl, message) {
  errorEl.textContent = message || ''
  input.classList.toggle('invalid', Boolean(message))
}

function validate() {
  let ok = true

  const email = emailInput.value.trim()
  if (!email) {
    setError(emailInput, emailError, '请输入邮箱')
    ok = false
  } else if (!EMAIL_RE.test(email)) {
    setError(emailInput, emailError, '邮箱格式不正确')
    ok = false
  } else {
    setError(emailInput, emailError, '')
  }

  const password = passwordInput.value
  if (!password) {
    setError(passwordInput, passwordError, '请输入密码')
    ok = false
  } else if (password.length < 6) {
    setError(passwordInput, passwordError, '密码至少 6 位')
    ok = false
  } else {
    setError(passwordInput, passwordError, '')
  }

  return ok
}

// 输入时清除该字段的错误提示
emailInput.addEventListener('input', () => setError(emailInput, emailError, ''))
passwordInput.addEventListener('input', () => setError(passwordInput, passwordError, ''))

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  if (!validate()) return

  const email = emailInput.value.trim()
  const password = passwordInput.value
  const remember = rememberInput.checked

  // 记住我：保存或清除邮箱
  if (remember) {
    localStorage.setItem('rn_remember_email', email)
  } else {
    localStorage.removeItem('rn_remember_email')
  }

  submitBtn.disabled = true
  submitBtn.textContent = '登录中…'

  // TODO: 接入真实登录接口
  await new Promise((r) => setTimeout(r, 800))

  console.log('login', { email, password, remember })

  submitBtn.disabled = false
  submitBtn.textContent = '登录'
})

// 第三方登录
document.querySelectorAll('.oauth-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const provider = btn.dataset.provider
    // TODO: 接入第三方 OAuth 登录
    console.log('oauth', provider)
  })
})
