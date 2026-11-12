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

type FieldErrors = Record<string, string>

/** Splits a failed request into per-field messages and one general message. */
function parseError(err: unknown): { fields: FieldErrors; general: string } {
  if (err instanceof ApiError && err.status === 400 && err.body && typeof err.body === "object") {
    const { invalidCredentials, ...fields } = err.body as FieldErrors
    return {
      fields,
      general: invalidCredentials ? "Невірна пошта або пароль. Перевірте дані й спробуйте ще раз." : "",
    }
  }
  return { fields: {}, general: "Не вдалося з'єднатися з сервером. Спробуйте ще раз за хвилину." }
}

const COPY: Record<AuthMode, { title: string; lede: string }> = {
  login: { title: "З поверненням", lede: "Увійдіть, щоб бачити свої документи, квитанції та тариф." },
  register: { title: "Створіть акаунт", lede: "Безкоштовно: 100 документів на місяць, без банківської картки." },
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
  const score = passwordScore(value)
  const labels = ["Введіть пароль", "Слабкий", "Середній", "Добрий", "Надійний"]
  const colors = [theme.colors.gray[4], theme.colors.red[6], theme.colors.orange[6], theme.colors.yellow[6], theme.colors.green[6]]
  return (
    <Box mt={-4}>
      <Group spacing={4} grow>
        {[1, 2, 3, 4].map((i) => (
          <Box key={i} h={4} sx={{ borderRadius: 2, background: i <= score ? colors[score] : theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[2], transition: "background 150ms" }} />
        ))}
      </Group>
      <Text fz="xs" c="dimmed" mt={4}>{labels[score]}{value.length > 0 && value.length < 8 ? " · мінімум 8 символів" : ""}</Text>
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
  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : "Вкажіть коректну пошту"),
      password: (v) => (v.length > 0 ? null : "Введіть пароль"),
    },
  })
  const { submit, loading, fields, general } = useSubmit(() => authApi.login({ email: form.values.email.trim(), password: form.values.password }))

  return (
    <form onSubmit={form.onSubmit(submit)} noValidate>
      <Stack spacing="sm">
        <GeneralError message={general} />
        <TextInput
          data-autofocus label="Електронна пошта" placeholder="name@company.com" size="md" type="email" autoComplete="email"
          icon={<IconMail size="1rem" />} {...form.getInputProps("email")} error={form.errors.email || fields.email}
        />
        <PasswordInput
          label="Пароль" placeholder="Ваш пароль" size="md" autoComplete="current-password"
          icon={<IconLock size="1rem" />} {...form.getInputProps("password")} error={form.errors.password || fields.password}
        />
        <Button type="submit" size="md" fullWidth mt="xs" loading={loading}>Увійти</Button>
      </Stack>
    </form>
  )
}

function RegisterForm() {
  const form = useForm({
    initialValues: { fullname: "", email: "", password: "", confirmPassword: "" },
    validate: {
      fullname: (v) => (v.trim().length >= 3 ? null : "Щонайменше 3 символи"),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : "Вкажіть коректну пошту"),
      password: (v) => (v.length >= 8 ? null : "Щонайменше 8 символів"),
      confirmPassword: (v, values) => (v === values.password ? null : "Паролі не збігаються"),
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
          data-autofocus label="Ім'я та прізвище" placeholder="Іван Петренко" size="md" autoComplete="name"
          icon={<IconUser size="1rem" />} {...form.getInputProps("fullname")} error={form.errors.fullname || fields.fullname}
        />
        <TextInput
          label="Електронна пошта" placeholder="name@company.com" size="md" type="email" autoComplete="email"
          icon={<IconMail size="1rem" />} {...form.getInputProps("email")} error={form.errors.email || fields.email}
        />
        <PasswordInput
          label="Пароль" placeholder="Мінімум 8 символів" size="md" autoComplete="new-password"
          icon={<IconLock size="1rem" />} {...form.getInputProps("password")} error={form.errors.password || fields.password}
        />
        <PasswordStrength value={form.values.password} />
        <PasswordInput
          label="Повторіть пароль" placeholder="Ще раз той самий пароль" size="md" autoComplete="new-password"
          icon={<IconCheck size="1rem" />} {...form.getInputProps("confirmPassword")} error={form.errors.confirmPassword || fields.confirmPassword}
        />
        <Button type="submit" size="md" fullWidth mt="xs" loading={loading}>Створити акаунт</Button>
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
  const opened = useGeneralStore((s) => s.isLoginModalOpen)
  const mode = useGeneralStore((s) => s.authMode)
  const setMode = useGeneralStore((s) => s.setAuthMode)
  const closeAuth = useGeneralStore((s) => s.closeAuth)
  const copy = COPY[mode]

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
          <Title order={2} fz={26}>{copy.title}</Title>
          <Text c="dimmed" fz="sm">{copy.lede}</Text>
        </Stack>
        <SegmentedControl
          fullWidth
          value={mode}
          onChange={(v) => setMode(v as AuthMode)}
          data={[{ label: "Вхід", value: "login" }, { label: "Реєстрація", value: "register" }]}
        />
        {mode === "login" ? <LoginForm key="login" /> : <RegisterForm key="register" />}
        <Text fz="xs" c="dimmed" ta="center">
          {mode === "login" ? "Ще немає акаунта? " : "Уже є акаунт? "}
          <Text
            span c="orange" fw={600} sx={{ cursor: "pointer" }} role="button" tabIndex={0}
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Зареєструватися" : "Увійти"}
          </Text>
        </Text>
      </Stack>
    </Modal>
  )
}
export default AuthOverlay
