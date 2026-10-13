const TOKEN_KEY = 'mathmaster_user_token'

export function readSession() {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveSession(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Login still works in memory when browser storage is unavailable.
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // The caller also clears its in-memory session.
  }
}
