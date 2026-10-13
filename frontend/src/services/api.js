const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function request(token, path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = Array.isArray(data?.detail)
      ? data.detail.map(item => `${(item.loc ?? []).filter(part => part !== 'body').join('.')}: ${item.msg}`).join('; ')
      : data?.detail
    const error = new Error(response.status === 401 ? 'Your session has expired. Please log in again.' : typeof detail === 'string' ? detail : 'The request failed. Please try again.')
    error.status = response.status
    throw error
  }
  return data
}
