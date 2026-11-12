import {
  Button,
  Col,
  Grid,
  Group,
  Modal,
  Paper,
  Text,
  TextInput,
} from "@mantine/core"
import React, { useState } from "react"
import { useGeneralStore } from "../stores/generalStore"
import { useForm } from "@mantine/form"
import { useUserStore } from "../stores/userStore"
import { ApiError } from "../api/http"
import { authApi } from "../api/auth"

type FieldErrors = Record<string, string>

/** Field errors from a 400 body like { email: "Email already in use" }. */
const fieldErrors = (err: unknown): FieldErrors =>
  err instanceof ApiError && err.status === 400 && err.body && typeof err.body === "object" ? err.body : {}
function AuthOverlay() {
  const isLoginModalOpen = useGeneralStore((state) => state.isLoginModalOpen)
  const toggleLoginModal = useGeneralStore((state) => state.toggleLoginModal)
  const [isRegister, setIsRegister] = useState(true)
  const toggleForm = () => {
    setIsRegister(!isRegister)
  }

  const Register = () => {
    const form = useForm({
      initialValues: {
        fullname: "",
        email: "",
        password: "",
        confirmPassword: "",
      },
      validate: {
        fullname: (value: string) =>
          value.trim().length >= 3
            ? null
            : "Username must be at least 3 characters",
        email: (value: string) =>
          value.includes("@") ? null : "Invalid email",
        password: (value: string) =>
          value.trim().length >= 3
            ? null
            : "Password must be at least 3 characters",
        confirmPassword: (value: string, values) =>
          value.trim().length >= 3 && value === values.password
            ? null
            : "Passwords do not match",
      },
    })
    const setUser = useUserStore((state) => state.setUser)
    const setIsLoginOpen = useGeneralStore((state) => state.toggleLoginModal)

    const [errors, setErrors] = React.useState<FieldErrors>({})
    const [loading, setLoading] = React.useState(false)

    const handleRegister = async () => {
      setErrors({})
      setLoading(true)
      try {
        const { user } = await authApi.register(form.values)
        setUser(user)
        setIsLoginOpen()
      } catch (err) {
        setErrors(fieldErrors(err))
      } finally {
        setLoading(false)
      }
    }

    return (
      <Paper>
        <Text align="center" size="xl">
          Register
        </Text>

        <form
          onSubmit={form.onSubmit(() => {
            handleRegister()
          })}
        >
          <Grid mt={20}>
            <Col span={12} md={6}>
              <TextInput
                label="Fullname"
                placeholder="Choose a full name"
                {...form.getInputProps("fullname")}
                error={form.errors.username || (errors?.username as string)}
              />
            </Col>

            <Col span={12} md={6}>
              <TextInput
                autoComplete="off"
                label="Email"
                placeholder="Enter your email"
                {...form.getInputProps("email")}
                error={form.errors.email || (errors?.email as string)}
              />
            </Col>
            <Col span={12} md={6}>
              <TextInput
                autoComplete="off"
                label="Password"
                type="password"
                placeholder="Enter your password"
                {...form.getInputProps("password")}
                error={form.errors.password || (errors?.password as string)}
              />
            </Col>
            <Col span={12} md={6}>
              <TextInput
                {...form.getInputProps("confirmPassword")}
                error={
                  form.errors.confirmPassword ||
                  (errors?.confirmPassword as string)
                }
                autoComplete="off"
                label="Confirm Password"
                type="password"
                placeholder="Confirm your password"
              />
            </Col>

            <Col span={12}>
              <Button variant="link" onClick={toggleForm} pl={0}>
                Already registered? Login here
              </Button>
            </Col>
          </Grid>

          <Group position="left" mt={20}>
            <Button
              variant="outline"
              color="blue"
              type="submit"
              disabled={loading}
            >
              Register
            </Button>
            <Button variant="outline" color="red">
              Cancel
            </Button>
          </Group>
        </form>
      </Paper>
    )
  }

  const Login = () => {
    const [loading, setLoading] = React.useState(false)
    const setUser = useUserStore((state) => state.setUser)
    const setIsLoginOpen = useGeneralStore((state) => state.toggleLoginModal)
    const [errors, setErrors] = React.useState<FieldErrors>({})
    const [invalidCredentials, setInvalidCredentials] = React.useState("")
    const form = useForm({
      initialValues: {
        email: "",
        password: "",
      },
      validate: {
        email: (value: string) =>
          value.includes("@") ? null : "Invalid email",
        password: (value: string) =>
          value.trim().length >= 3
            ? null
            : "Password must be at least 3 characters",
      },
    })

    const handleLogin = async () => {
      setErrors({})
      setInvalidCredentials("")
      setLoading(true)
      try {
        const { user } = await authApi.login(form.values)
        setUser(user)
        setIsLoginOpen()
      } catch (err) {
        const fields = fieldErrors(err)
        setErrors(fields)
        setInvalidCredentials(fields.invalidCredentials ?? "")
      } finally {
        setLoading(false)
      }
    }
    return (
      <Paper>
        <Text align="center" size="xl">
          Login
        </Text>
        <form
          onSubmit={form.onSubmit(() => {
            handleLogin()
          })}
        >
          <Grid style={{ marginTop: 20 }}>
            <Col span={12} md={6}>
              <TextInput
                autoComplete="off"
                label="Email"
                placeholder="Enter your email"
                {...form.getInputProps("email")}
                error={form.errors.email || (errors?.email as string)}
              />
            </Col>
            <Col span={12} md={6}>
              <TextInput
                autoComplete="off"
                label="Password"
                type="password"
                placeholder="Enter your password"
                {...form.getInputProps("password")}
                error={form.errors.password || (errors?.password as string)}
              />
            </Col>
            {/* Not registered yet? then render register component. use something like a text, not a button */}
            <Col span={12} md={6}>
              <Text color="red">{invalidCredentials}</Text>
            </Col>
            <Col span={12}>
              <Button pl={0} variant="link" onClick={toggleForm}>
                Not registered yet? Register here
              </Button>
            </Col>
          </Grid>
          {/* buttons: login or cancel */}
          <Group position="left" style={{ marginTop: 20 }}>
            <Button
              variant="outline"
              color="blue"
              type="submit"
              disabled={loading}
            >
              Login
            </Button>
            <Button variant="outline" color="red" onClick={toggleLoginModal}>
              Cancel
            </Button>
          </Group>
        </form>
      </Paper>
    )
  }
  return (
    <Modal centered opened={isLoginModalOpen} onClose={toggleLoginModal}>
      {isRegister ? <Register /> : <Login />}
    </Modal>
  )
}
export default AuthOverlay
