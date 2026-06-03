'use strict'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const form = document.getElementById('forgot-form')
const emailInput = document.getElementById('email')
const submitBtn = document.getElementById('submit-btn')
const emailError = document.getElementById('email-error')
const sentNote = document.getElementById('sent-note')

function setError(input, errorEl, message) {
  errorEl.textContent = message || ''
  input.classList.toggle('invalid', Boolean(message))
}

function validate() {
  const email = emailInput.value.trim()
  if (!email) {
    setError(emailInput, emailError, '请输入邮箱')
    return false
  }
  if (!EMAIL_RE.test(email)) {
    setError(emailInput, emailError, '邮箱格式不正确')
    return false
  }
  setError(emailInput, emailError, '')
  return true
}

emailInput.addEventListener('input', () => {
  setError(emailInput, emailError, '')
  sentNote.hidden = true
})

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  if (!validate()) return

  const email = emailInput.value.trim()

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
