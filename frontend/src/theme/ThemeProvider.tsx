import { ReactNode, useEffect } from "react"
import { ColorScheme, ColorSchemeProvider, MantineProvider, useMantineColorScheme } from "@mantine/core"
import { useColorScheme, useLocalStorage } from "@mantine/hooks"

/**
 * Light/dark theme for the whole app. The choice is saved in localStorage; the
 * first visit follows the OS setting. `data-theme` on <html> lets plain CSS
 * (product.css) switch its variables without going through React.
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
    key: "ap-color-scheme",
    defaultValue: system,
    getInitialValueInEffect: false,
  })
  const toggle = (value?: ColorScheme) => setColorScheme(value || (colorScheme === "dark" ? "light" : "dark"))

  useEffect(() => {
    document.documentElement.dataset.theme = colorScheme
    document.documentElement.style.colorScheme = colorScheme // native scrollbars, inputs, date pickers
  }, [colorScheme])

  return (
    <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggle}>
      <MantineProvider withGlobalStyles withNormalizeCSS theme={{ colorScheme }}>
        {children}
      </MantineProvider>
    </ColorSchemeProvider>
  )
}

/** True while the dark theme is active. */
export function useIsDark(): boolean {
  return useMantineColorScheme().colorScheme === "dark"
}
