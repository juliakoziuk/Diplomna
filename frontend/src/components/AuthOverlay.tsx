import { useState } from "react"
import {
  Alert, Box, Button, Group, Modal, PasswordInput, SegmentedControl, Stack, Text, TextInput, Title, useMantineTheme,
} from "@mantine/core"
import { useForm } from "@mantine/form"
import { IconAlertCircle, IconCheck, IconLock, IconMail, IconUser } from "@tabler/icons-react"
import { AuthMode, useGeneralStore } from "../stores/generalStore"
import { useUserStore } from "../stores/userStore"
import { ApiError } from "../api/http"
import { AuthUser, authApi } from "../api/auth"
import { tr, useI18n } from "../i18n"

type FieldErrors = Record<string, string>

/**
 * Server field messages ("Email already in use", …) come in English from the API; known ones
 * are shown in the current language, anything else is shown as received.
 */
const SERVER_FIELD_MESSAGES: [RegExp, () => string][] = [
  [/^Email already in use$/i, () => tr("This email is already registered", "Ця пошта вже зареєстрована")],
  [/^Password and confirm password are not the same\.?$/i, () => tr("Passwords do not match", "Паролі не збігаються")],
  [/^Email must be valid\.?$/i, () => tr("Enter a valid email", "Вкажіть коректну пошту")],
  [/^Password must be at least 8 characters\.?$/i, () => tr("At least 8 characters", "Щонайменше 8 символів")],
]
const localize = (m: string) => SERVER_FIELD_MESSAGES.find(([re]) => re.test(m))?.[1]() ?? m

/** Splits a failed request into per-field messages and one general message. */
function parseError(err: unknown): { fields: FieldErrors; general: string } {
  if (err instanceof ApiError && err.status === 400 && err.body && typeof err.body === "object") {
    const { invalidCredentials, ...rest } = err.body as FieldErrors
    const fields = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, localize(String(v))]))
    return {
      fields,
      general: invalidCredentials ? tr("Wrong email or password. Check your details and try again.", "Невірна пошта або пароль. Перевірте дані й спробуйте ще раз.") : "",
    }
  }
  return { fields: {}, general: tr("Could not reach the server. Please try again in a minute.", "Не вдалося з'єднатися з сервером. Спробуйте ще раз за хвилину.") }
}

/** 0–4: length, mixed case, digit, symbol. */
function passwordScore(value: string): number {
  if (!value) return 0
  let score = 0
  if (value.length >= 8) score++
  if (/[a-zа-яіїєґ]/.test(value) && /[A-ZА-ЯІЇЄҐ]/.test(value)) score++
  if (/\d/.test(value)) score++
  if (/[^\p{L}\d]/u.test(value)) score++
  return Math.max(score, 1) // any non-empty password is at least "weak"
}

function PasswordStrength({ value }: { value: string }) {
  const theme = useMantineTheme()
  const { t } = useI18n()
  const score = passwordScore(value)
  const labels = [t("Enter a password", "Введіть пароль"), t("Weak", "Слабкий"), t("Fair", "Середній"), t("Good", "Добрий"), t("Strong", "Надійний")]
  const colors = [theme.colors.gray[4], theme.colors.red[6], theme.colors.orange[6], theme.colors.yellow[6], theme.colors.green[6]]
  return (
    <Box mt={-4}>
      <Group spacing={4} grow>
        {[1, 2, 3, 4].map((i) => (
          <Box key={i} h={4} sx={{ borderRadius: 2, background: i <= score ? colors[score] : theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[2], transition: "background 150ms" }} />
        ))}
      </Group>
      <Text fz="xs" c="dimmed" mt={4}>{labels[score]}{value.length > 0 && value.length < 8 ? t(" · at least 8 characters", " · мінімум 8 символів") : ""}</Text>
    </Box>
  )
}

function useSubmit(action: () => Promise<{ user: AuthUser }>) {
  const setUser = useUserStore((s) => s.setUser)
  const closeAuth = useGeneralStore((s) => s.closeAuth)
  const [loading, setLoading] = useState(false)
  const [fields, setFields] = useState<FieldErrors>({})
  const [general, setGeneral] = useState("")

  const submit = async () => {
    setLoading(true)
    setFields({})
    setGeneral("")
    try {
      const { user } = await action()
      setUser(user)
      closeAuth()
    } catch (err) {
      const parsed = parseError(err)
      setFields(parsed.fields)
      setGeneral(parsed.general)
    } finally {
      setLoading(false)
    }
  }
  return { submit, loading, fields, general }
}

function GeneralError({ message }: { message: string }) {
  if (!message) return null
  return <Alert color="red" variant="light" icon={<IconAlertCircle size="1rem" />}>{message}</Alert>
}

function LoginForm() {
  const { t } = useI18n()
  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : t("Enter a valid email", "Вкажіть коректну пошту")),
      password: (v) => (v.length > 0 ? null : t("Enter your password", "Введіть пароль")),
    },
  })
  const { submit, loading, fields, general } = useSubmit(() => authApi.login({ email: form.values.email.trim(), password: form.values.password }))

  return (
    <form onSubmit={form.onSubmit(submit)} noValidate>
      <Stack spacing="sm">
        <GeneralError message={general} />
        <TextInput
          data-autofocus label={t("Email", "Електронна пошта")} placeholder="name@company.com" size="md" type="email" autoComplete="email"
          icon={<IconMail size="1rem" />} {...form.getInputProps("email")} error={form.errors.email || fields.email}
        />
        <PasswordInput
          label={t("Password", "Пароль")} placeholder={t("Your password", "Ваш пароль")} size="md" autoComplete="current-password"
          icon={<IconLock size="1rem" />} {...form.getInputProps("password")} error={form.errors.password || fields.password}
        />
        <Button type="submit" size="md" fullWidth mt="xs" loading={loading}>{t("Sign in", "Увійти")}</Button>
      </Stack>
    </form>
  )
}

function RegisterForm() {
  const { t } = useI18n()
  const form = useForm({
    initialValues: { fullname: "", email: "", password: "", confirmPassword: "" },
    validate: {
      fullname: (v) => (v.trim().length >= 3 ? null : t("At least 3 characters", "Щонайменше 3 символи")),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : t("Enter a valid email", "Вкажіть коректну пошту")),
      password: (v) => (v.length >= 8 ? null : t("At least 8 characters", "Щонайменше 8 символів")),
      confirmPassword: (v, values) => (v === values.password ? null : t("Passwords do not match", "Паролі не збігаються")),
    },
  })
  const { submit, loading, fields, general } = useSubmit(() =>
    authApi.register({ ...form.values, fullname: form.values.fullname.trim(), email: form.values.email.trim() }),
  )

  return (
    <form onSubmit={form.onSubmit(submit)} noValidate>
      <Stack spacing="sm">
        <GeneralError message={general} />
        <TextInput
          data-autofocus label={t("Full name", "Ім'я та прізвище")} placeholder={t("Jane Smith", "Іван Петренко")} size="md" autoComplete="name"
          icon={<IconUser size="1rem" />} {...form.getInputProps("fullname")} error={form.errors.fullname || fields.fullname}
        />
        <TextInput
          label={t("Email", "Електронна пошта")} placeholder="name@company.com" size="md" type="email" autoComplete="email"
          icon={<IconMail size="1rem" />} {...form.getInputProps("email")} error={form.errors.email || fields.email}
        />
        <PasswordInput
          label={t("Password", "Пароль")} placeholder={t("At least 8 characters", "Мінімум 8 символів")} size="md" autoComplete="new-password"
          icon={<IconLock size="1rem" />} {...form.getInputProps("password")} error={form.errors.password || fields.password}
        />
        <PasswordStrength value={form.values.password} />
        <PasswordInput
          label={t("Repeat password", "Повторіть пароль")} placeholder={t("The same password again", "Ще раз той самий пароль")} size="md" autoComplete="new-password"
          icon={<IconCheck size="1rem" />} {...form.getInputProps("confirmPassword")} error={form.errors.confirmPassword || fields.confirmPassword}
        />
        <Button type="submit" size="md" fullWidth mt="xs" loading={loading}>{t("Create account", "Створити акаунт")}</Button>
      </Stack>
    </form>
  )
}

function Brand() {
  const theme = useMantineTheme()
  return (
    <Group spacing={8}>
      <Box w={16} h={16} sx={{ border: `2px solid ${theme.colors.orange[7]}`, borderRadius: 3 }} />
      <Text fw={700} fz="lg">AnchorProof</Text>
    </Group>
  )
}

function AuthOverlay() {
  const { t } = useI18n()
  const opened = useGeneralStore((s) => s.isLoginModalOpen)
  const mode = useGeneralStore((s) => s.authMode)
  const setMode = useGeneralStore((s) => s.setAuthMode)
  const closeAuth = useGeneralStore((s) => s.closeAuth)
  const copy: Record<AuthMode, { title: string; lede: string }> = {
    login: {
      title: t("Welcome back", "З поверненням"),
      lede: t("Sign in to see your documents, receipts and plan.", "Увійдіть, щоб бачити свої документи, квитанції та тариф."),
    },
    register: {
      title: t("Create an account", "Створіть акаунт"),
      lede: t("Free: 100 documents a month, no bank card.", "Безкоштовно: 100 документів на місяць, без банківської картки."),
    },
  }
  const c = copy[mode]

  return (
    <Modal
      opened={opened}
      onClose={closeAuth}
      centered
      size={440}
      radius="lg"
      padding="xl"
      title={<Brand />}
      overlayProps={{ blur: 4, opacity: 0.55 }}
      transitionProps={{ transition: "pop", duration: 160 }}
      styles={{ header: { marginBottom: 4 }, title: { flex: 1 } }}
    >
      <Stack spacing="lg">
        <Stack spacing={4}>
          <Title order={2} fz={26}>{c.title}</Title>
          <Text c="dimmed" fz="sm">{c.lede}</Text>
        </Stack>
        <SegmentedControl
          fullWidth
          value={mode}
          onChange={(v) => setMode(v as AuthMode)}
          data={[{ label: t("Sign in", "Вхід"), value: "login" }, { label: t("Sign up", "Реєстрація"), value: "register" }]}
        />
        {mode === "login" ? <LoginForm key="login" /> : <RegisterForm key="register" />}
        <Text fz="xs" c="dimmed" ta="center">
          {mode === "login" ? t("No account yet? ", "Ще немає акаунта? ") : t("Already have an account? ", "Уже є акаунт? ")}
          <Text
            span c="orange" fw={600} sx={{ cursor: "pointer" }} role="button" tabIndex={0}
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? t("Sign up", "Зареєструватися") : t("Sign in", "Увійти")}
          </Text>
        </Text>
      </Stack>
    </Modal>
  )
}
export default AuthOverlay
