import { useUserStore } from "../stores/userStore"
import { getLang, tr } from "../i18n"

/**
 * Where the REST API lives. In production the backend serves the frontend, so the
 * default is same-origin (""). `npm run dev` talks to the backend on :3000; set
 * VITE_API_URL to point a build somewhere else.
 */
export const API_BASE: string =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "")

/** Absolute API URL for showing in copy-paste examples (curl). */
export const API_URL_DISPLAY: string = API_BASE || window.location.origin

export class ApiError extends Error {
  /** `body` is the raw JSON error body, e.g. { email: "Email already in use" } for field errors. */
  constructor(public status: number, message: string, public body?: any) {
    super(message)
  }
}

/** Access tokens live ~150 s, so a 401 usually just means "refresh first". */
async function refreshSession(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include", headers: { "Accept-Language": getLang() } })
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
      headers: { "Content-Type": "application/json", "Accept-Language": getLang(), ...(init.headers || {}) },
    })

  let res = await send()
  if (res.status === 401) {
    if (await refreshSession()) {
      res = await send()
    } else {
      useUserStore.setState({ id: undefined, fullname: "", email: "", avatarUrl: null })
      throw new ApiError(401, tr("Your session has expired. Please sign in again.", "Сесія завершилась. Увійдіть знову."))
    }
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, messageOf(body, tr(`Error ${res.status}`, `Помилка ${res.status}`)), body)
  return body as T
}

export const post = <T>(path: string, data?: unknown) =>
  api<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) })
