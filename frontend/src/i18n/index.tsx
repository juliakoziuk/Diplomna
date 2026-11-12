import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react"

/**
 * Minimal i18n: every user-facing string is written as a pair, t("English", "Українська"),
 * so both versions sit side by side at the place they are used. English is the default;
 * the choice is saved in localStorage.
 */
export type Lang = "en" | "uk"

const STORAGE_KEY = "ap-lang"

function readLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "uk" ? "uk" : "en"
  } catch {
    return "en"
  }
}

/** Current language for code that runs outside React (api helpers, receipt checks, print HTML). */
let current: Lang = readLang()

export const getLang = (): Lang => current
export const tr = (en: string, uk: string): string => (current === "uk" ? uk : en)

/** BCP 47 locale for dates and numbers. */
export const localeOf = (lang: Lang = current): string => (lang === "uk" ? "uk-UA" : "en-GB")

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (en: string, uk: string) => string
  /** Locale for toLocaleString / toLocaleDateString. */
  locale: string
}

const Ctx = createContext<I18nValue>({ lang: "en", setLang: () => undefined, t: (en) => en, locale: "en-GB" })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current)

  const setLang = (next: Lang) => {
    current = next // update first, so non-React helpers see it during the re-render
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode: the choice just will not persist */
    }
    setLangState(next)
  }

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (en, uk) => (lang === "uk" ? uk : en), locale: localeOf(lang) }),
    [lang],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useI18n = () => useContext(Ctx)
