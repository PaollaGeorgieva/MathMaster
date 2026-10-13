import { useEffect, useState } from 'react'
import { request } from '../services/api'

export default function useResource(token, path) {
  const [state, setState] = useState({ data: null, error: '', loading: true })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    request(token, path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ data, error: '', loading: false })
    }).catch(error => {
      if (!controller.signal.aborted) setState({ data: null, error: error.message, loading: false })
    })
    return () => controller.abort()
  }, [token, path, version])
  return { ...state, reload: () => { setState({ data: null, error: '', loading: true }); setVersion(v => v + 1) } }
}
