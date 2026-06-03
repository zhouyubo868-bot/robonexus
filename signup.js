'use strict'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const form = document.getElementById('signup-form')
const nameInput = document.getElementById('name')
const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const password2Input = document.getElementById('password2')
const agreeInput = document.getElementById('agree')
const submitBtn = document.getElementById('submit-btn')
const pwdToggle = document.getElementById('pwd-toggle')
const nameError = document.getElementById('name-error')
const emailError = document.getElementById('email-error')
const passwordError = document.getElementById('password-error')
const password2Error = document.getElementById('password2-error')
const agreeError = document.getElementById('agree-error')

// 显示 / 隐藏密码
pwdToggle.addEventListener('click', () => {
  const show = passwordInput.type === 'password'
  passwordInput.type = show ? 'text' : 'password'
  pwdToggle.textContent = show ? '隐藏' : '显示'
  pwdToggle.setAttribute('aria-label', show ? '隐藏密码' : '显示密码')
})

function setError(input, errorEl, message) {
  errorEl.textContent = message || ''
  if (input) input.classList.toggle('invalid', Boolean(message))
}

function validate() {
  let ok = true

  const name = nameInput.value.trim()
  if (!name) {
    setError(nameInput, nameError, '请输入用户名')
    ok = false
  } else {
    setError(nameInput, nameError, '')
  }

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

  const password2 = password2Input.value
  if (!password2) {
    setError(password2Input, password2Error, '请再次输入密码')
    ok = false
  } else if (password2 !== password) {
    setError(password2Input, password2Error, '两次输入的密码不一致')
    ok = false
  } else {
    setError(password2Input, password2Error, '')
  }

  if (!agreeInput.checked) {
    setError(null, agreeError, '请先同意服务条款和隐私政策')
    ok = false
  } else {
    setError(null, agreeError, '')
  }

  return ok
}

// 输入时清除该字段的错误提示
nameInput.addEventListener('input', () => setError(nameInput, nameError, ''))
emailInput.addEventListener('input', () => setError(emailInput, emailError, ''))
passwordInput.addEventListener('input', () => setError(passwordInput, passwordError, ''))
password2Input.addEventListener('input', () => setError(password2Input, password2Error, ''))
agreeInput.addEventListener('change', () => setError(null, agreeError, ''))

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  if (!validate()) return

  const name = nameInput.value.trim()
  const email = emailInput.value.trim()
  const password = passwordInput.value

  submitBtn.disabled = true
  submitBtn.textContent = '注册中…'

  // TODO: 接入真实注册接口
  await new Promise((r) => setTimeout(r, 800))

  console.log('signup', { name, email, password })

  submitBtn.disabled = false
  submitBtn.textContent = '注册'
})
