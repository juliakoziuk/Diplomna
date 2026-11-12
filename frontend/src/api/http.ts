import { useUserStore } from "../stores/userStore"

export const API_BASE = "http://localhost:3000"

export class ApiError extends Error {
  /** `body` is the raw JSON error body, e.g. { email: "Email already in use" } for field errors. */
  constructor(public status: number, message: string, public body?: any) {
    super(message)
  }
}

/** Access tokens live ~150 s, so a 401 usually just means "refresh first". */
async function refreshSession(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" })
  return res.ok
}

function messageOf(body: any, fallback: string): string {
  const m = body?.message
  if (Array.isArray(m)) return m.join(", ")
  if (typeof m === "string") return m
  if (m && typeof m === "object") return Object.values(m).join(", ")
  return fallback
}

/** JSON request to the REST API with cookie auth and one silent token refresh. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = () =>
    fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    })

  let res = await send()
  if (res.status === 401) {
    if (await refreshSession()) {
      res = await send()
    } else {
      useUserStore.setState({ id: undefined, fullname: "", email: "", avatarUrl: null })
      throw new ApiError(401, "Сесія завершилась. Увійдіть знову.")
    }
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, messageOf(body, `Помилка ${res.status}`), body)
  return body as T
}

export const post = <T>(path: string, data?: unknown) =>
  api<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) })
