'use client'

function clearBrowserCookies(): void {
  if (typeof document === 'undefined') return

  const cookies = document.cookie ? document.cookie.split(';') : []
  for (const cookie of cookies) {
    const eqPos = cookie.indexOf('=')
    const name = (eqPos > -1 ? cookie.substring(0, eqPos) : cookie).trim()
    if (!name) continue

    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
  }
}

export function clearClientAuthState(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.clear()
  } catch {}

  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear()
  } catch {}

  try {
    clearBrowserCookies()
  } catch {}
}

