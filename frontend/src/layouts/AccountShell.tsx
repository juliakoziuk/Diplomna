import React, { useEffect } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { ActionIcon, Box, Button, Container, Group, MantineProvider, Text, Tooltip, createStyles, rem, useMantineColorScheme } from "@mantine/core"
import { IconMoon, IconSun } from "@tabler/icons-react"
import AuthOverlay from "../components/AuthOverlay"
import { useUserStore } from "../stores/userStore"
import { useGeneralStore } from "../stores/generalStore"
import { authApi } from "../api/auth"
import "./account-shell.css"

const useStyles = createStyles((theme) => ({
  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
    borderBottom: `1px solid ${theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]}`,
  },
  logo: {
    fontWeight: 700,
    fontSize: rem(18),
    color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.black,
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: rem(8),
  },
  mark: {
    width: rem(16),
    height: rem(16),
    border: `2px solid ${theme.colors.orange[7]}`,
    borderRadius: rem(3),
  },
  link: {
    color: theme.colorScheme === "dark" ? theme.colors.dark[1] : theme.colors.gray[7],
    textDecoration: "none",
    fontSize: theme.fontSizes.sm,
    padding: `${rem(6)} ${rem(10)}`,
    borderRadius: theme.radius.sm,
    "&:hover": { background: theme.colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[1] },
    "&.active": {
      color: theme.colorScheme === "dark" ? theme.colors.orange[4] : theme.colors.orange[8],
      background: theme.colorScheme === "dark" ? "rgba(247, 103, 7, 0.16)" : theme.colors.orange[0],
      fontWeight: 600,
    },
  },
}))

/** Brand theme for the product pages; the chat UI keeps the default theme. */
const theme = {
  primaryColor: "orange",
  primaryShade: 7 as const,
  fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
  headings: { fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif", fontWeight: 600 },
  defaultRadius: "md",
}

/** Asks for sign-in when a page needs it, without toggling an already open modal shut. */
export function useRequireLogin(required: boolean) {
  const userId = useUserStore((s) => s.id)
  useEffect(() => {
    // Set, never toggle: StrictMode runs effects twice in development.
    if (required && !userId) useGeneralStore.setState({ isLoginModalOpen: true })
  }, [required, userId])
  return userId
}

export default function AccountShell({ children }: { children: React.ReactNode }) {
  const { classes } = useStyles()
  const navigate = useNavigate()
  const user = useUserStore((s) => s)
  const toggleLogin = useGeneralStore((s) => s.toggleLoginModal)
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const dark = colorScheme === "dark"

  const handleLogout = async () => {
    await authApi.logout().catch(() => undefined)
    useUserStore.setState({ id: undefined, fullname: "", avatarUrl: null, email: "" })
    navigate("/pricing")
  }

  return (
    <MantineProvider inherit theme={theme}>
      <div className="ap-shell">
      <AuthOverlay />
      <Box className={classes.header}>
        <Container size="lg">
          <Group position="apart" py="sm" noWrap>
            <Group spacing="lg" noWrap>
              <NavLink to="/product" className={classes.logo}>
                <span className={classes.mark} />
                AnchorProof
              </NavLink>
              <Group spacing={2} noWrap sx={{ overflowX: "auto" }}>
                <NavLink to="/product" className={classes.link}>Продукт</NavLink>
                <NavLink to="/pricing" className={classes.link}>Тарифи</NavLink>
                <NavLink to="/account" className={classes.link}>Кабінет</NavLink>
                <NavLink to="/technology" className={classes.link}>Для розробників</NavLink>
              </Group>
            </Group>
            <Group spacing="xs" noWrap>
              <Tooltip label={dark ? "Світла тема" : "Темна тема"} withArrow>
                <ActionIcon variant="default" size="md" onClick={() => toggleColorScheme()} aria-label={dark ? "Увімкнути світлу тему" : "Увімкнути темну тему"}>
                  {dark ? <IconSun size="1rem" /> : <IconMoon size="1rem" />}
                </ActionIcon>
              </Tooltip>
              {user.id ? (
                <>
                  <Text size="sm" c="dimmed" truncate maw={180}>{user.fullname}</Text>
                  <Button variant="subtle" color="gray" size="xs" onClick={handleLogout}>Вийти</Button>
                </>
              ) : (
                <Button size="xs" onClick={toggleLogin}>Увійти</Button>
              )}
            </Group>
          </Group>
        </Container>
      </Box>
      <Container size="lg" py="xl">{children}</Container>
      </div>
    </MantineProvider>
  )
}
