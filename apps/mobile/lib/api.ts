import { useAuth } from '@clerk/clerk-expo'
import { useCallback, useRef, useEffect } from 'react'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

export function useApiClient() {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const apiFetch = useCallback(
    async <T>(
      path: string,
      options?: RequestInit & { json?: unknown }
    ): Promise<T> => {
      const token = await getTokenRef.current()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        ...(options?.headers as Record<string, string>),
      }

      let body = options?.body
      if (options?.json) {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(options.json)
      }

      const res = await fetch(`${API_BASE_URL}/api/mobile${path}`, {
        ...options,
        headers,
        body,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      return res.json() as Promise<T>
    },
    []
  )

  return { apiFetch }
}
