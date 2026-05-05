import type { IPublicClientApplication } from '@azure/msal-browser'
import { getAccessToken } from '@/lib/auth/getAccessToken'

type JsonRecord = Record<string, unknown>

function isRecord(x: unknown): x is JsonRecord {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function readErrorCode(body: JsonRecord): string | undefined {
  const c = body.code
  return typeof c === 'string' ? c : undefined
}

function readErrorMessage(body: JsonRecord): string | undefined {
  const e = body.error
  return typeof e === 'string' ? e : undefined
}

/**
 * Loads `/api/employees` for the signed-in user. If the account exists in Entra
 * but not yet in Postgres (`USER_NOT_SYNCED`), runs `/api/auth/sync` once then retries.
 */
export async function loadEmployeeDirectory(
  instance: IPublicClientApplication,
  options?: { forceRefresh?: boolean }
): Promise<unknown[]> {
  const token = await getAccessToken(instance, { forceRefresh: options?.forceRefresh })
  if (!token) {
    throw Object.assign(new Error('No access token. Please sign in again.'), { code: 'NO_ACCESS_TOKEN' })
  }

  const authHeaders = { Authorization: `Bearer ${token}` }

  const getDirectory = async () => {
    const res = await fetch('/api/employees', { headers: authHeaders, cache: 'no-store' })
    const data: unknown = await res.json().catch(() => null)
    return { res, data }
  }

  let { res, data } = await getDirectory()

  if (res.status === 401 && isRecord(data) && readErrorCode(data) === 'USER_NOT_SYNCED') {
    const syncRes = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      cache: 'no-store',
    })
    const syncData: unknown = await syncRes.json().catch(() => null)
    if (!syncRes.ok) {
      const syncBody = isRecord(syncData) ? syncData : {}
      const err = new Error(
        readErrorMessage(syncBody) ?? `Sync failed (${syncRes.status})`
      ) as Error & { code?: string; status?: number }
      err.code = readErrorCode(syncBody)
      err.status = syncRes.status
      throw err
    }
    ;({ res, data } = await getDirectory())
  }

  if (!res.ok) {
    const body = isRecord(data) ? data : {}
    const err = new Error(readErrorMessage(body) ?? `Request failed (${res.status})`) as Error & {
      code?: string
      status?: number
    }
    err.code = readErrorCode(body)
    err.status = res.status
    throw err
  }

  if (!Array.isArray(data)) {
    throw new Error('Invalid directory response from server')
  }

  return data
}
