import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Group,
  List,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { IconAlertCircle, IconCheck, IconCreditCard } from "@tabler/icons-react"
import AccountShell from "../layouts/AccountShell"
import { useUserStore } from "../stores/userStore"
import { useGeneralStore } from "../stores/generalStore"
import { BillingOverview, Plan, PlanId, billingApi } from "../api/account"
import { SALES_EMAIL } from "../config"
import { useI18n } from "../i18n"
import { planFeatures, planLimit, planPrice } from "../i18n/plans"

export default function Pricing() {
  const navigate = useNavigate()
  const { t: tt, locale } = useI18n()
  const [params] = useSearchParams()
  const userId = useUserStore((s) => s.id)
  const toggleLogin = useGeneralStore((s) => s.toggleLoginModal)
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [overview, setOverview] = useState<BillingOverview | null>(null)
  const [busy, setBusy] = useState<PlanId | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Assume on until the server says otherwise, so the page does not flicker when payments are enabled
  const [billingEnabled, setBillingEnabled] = useState(true)

  useEffect(() => {
    billingApi.plans().then(setPlans).catch((e) => setError(e.message))
    billingApi.status().then((s) => setBillingEnabled(s.billingEnabled)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!userId) return setOverview(null)
    billingApi.overview().then(setOverview).catch(() => setOverview(null))
  }, [userId])

  const choose = async (plan: PlanId) => {
    if (!userId) return toggleLogin()
    setBusy(plan)
    setError(null)
    try {
      const res = await billingApi.checkout(plan)
      if (res.url) {
        window.location.assign(res.url)
        return
      }
      navigate("/account?changed=1")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  const current = overview?.plan

  return (
    <AccountShell>
      <Stack spacing="xl">
        <Stack spacing={6}>
          <Title order={1}>{tt("Pricing", "Тарифи")}</Title>
          <Text c="dimmed" maw={640}>
            {tt("You pay by the number of documents, with no hidden fees. You can change or cancel your plan in your account at any time.", "Платите за кількість документів, без прихованих комісій. Змінити або скасувати тариф можна в кабінеті будь-коли.")}
          </Text>
        </Stack>

        {params.get("checkout") === "cancel" && (
          <Alert color="gray" icon={<IconAlertCircle size="1rem" />}>
            {tt("Payment cancelled, nothing was charged. You can choose a plan again.", "Оплату скасовано, кошти не списано. Можете обрати тариф ще раз.")}
          </Alert>
        )}
        {error && (
          <Alert color="red" icon={<IconAlertCircle size="1rem" />} withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!plans ? (
          <Loader />
        ) : (
          <SimpleGrid cols={4} spacing="md" breakpoints={[{ maxWidth: "md", cols: 2 }, { maxWidth: "xs", cols: 1 }]}>
            {plans.map((plan) => {
              const isCurrent = current === plan.id || (!current && plan.id === "free" && !!userId)
              const highlight = plan.id === "search"
              return (
                <Card
                  key={plan.id}
                  withBorder
                  padding="lg"
                  sx={(t) => ({
                    display: "flex",
                    flexDirection: "column",
                    gap: t.spacing.sm,
                    borderColor: highlight ? t.colors.orange[6] : undefined,
                  })}
                >
                  <Group position="apart">
                    <Text fw={600}>{plan.name}</Text>
                    {isCurrent && <Badge color="green">{tt("Your plan", "Ваш тариф")}</Badge>}
                  </Group>
                  <Text fz={28} fw={600}>
                    {planPrice(plan.priceUah, locale)}
                    <Text span fz="sm" c="dimmed" fw={400}> {tt("/ mo", "/ міс")}</Text>
                  </Text>
                  <Text fz="sm" c="dimmed">
                    {planLimit(plan.anchorsPerMonth, locale)}
                  </Text>
                  <List spacing={4} size="sm" icon={<IconCheck size="0.9rem" />} sx={{ flex: 1 }}>
                    {planFeatures(plan.id).map((f) => <List.Item key={f}>{f}</List.Item>)}
                  </List>
                  {plan.id === "free" ? (
                    <Button variant="default" disabled={isCurrent} onClick={() => (userId ? navigate("/account") : toggleLogin())}>
                      {isCurrent ? tt("Current", "Поточний") : userId ? tt("Go to your account", "Перейти через кабінет") : tt("Start free", "Почати безкоштовно")}
                    </Button>
                  ) : (
                    <Button
                      variant={highlight ? "filled" : "light"}
                      loading={busy === plan.id}
                      disabled={!billingEnabled || (isCurrent && !overview?.cancelAtPeriodEnd)}
                      leftIcon={<IconCreditCard size="1rem" />}
                      onClick={() => choose(plan.id)}
                    >
                      {!billingEnabled
                        ? tt("Coming soon", "Скоро")
                        : isCurrent
                        ? tt("Current", "Поточний")
                        : current && current !== "free"
                        ? tt("Switch to this plan", "Перейти на цей тариф")
                        : tt("Subscribe", "Оформити")}
                    </Button>
                  )}
                </Card>
              )
            })}
          </SimpleGrid>
        )}

        <Card withBorder padding="lg">
          <Group position="apart" align="flex-start">
            <Stack spacing={4} maw={560}>
              <Text fw={600}>Enterprise</Text>
              <Text fz="sm" c="dimmed">
                {tt("Deployment in your own infrastructure, your own indexer key with multisig, and implementation support.", "Розгортання у вашій інфраструктурі, власний ключ індексатора з multisig, супровід впровадження.")}
              </Text>
            </Stack>
            {SALES_EMAIL && (
              <Button variant="default" component="a" href={`mailto:${SALES_EMAIL}?subject=AnchorProof%20Enterprise`}>
                {tt("Talk to us", "Обговорити")}
              </Button>
            )}
          </Group>
        </Card>

        {billingEnabled ? (
          <Alert color="blue" title={tt("Payment test mode", "Тестовий режим оплати")}>
            <Text fz="sm">
              {tt("Payments run through Stripe in test mode; no real money is charged. Card", "Оплата працює через Stripe у тестовому режимі, справжні гроші не списуються. Картка")}{" "}
              <Code>4242 4242 4242 4242</Code>{tt(", any future date and any CVC. 3-D Secure card:", ", будь-яка майбутня дата і будь-який CVC. Картка з 3-D Secure:")}{" "}
              <Code>4000 0027 6000 3184</Code>. {tt("Declined card:", "Відхилена картка:")} <Code>4000 0000 0000 0002</Code>.
            </Text>
          </Alert>
        ) : (
          <Alert color="gray" title={tt("Paid plans coming soon", "Платні тарифи скоро")}>
            <Text fz="sm">
              {tt("The free plan is available now and you do not need to add a card. Paid plans will appear later.", "Зараз доступний безкоштовний тариф, прив'язувати картку не потрібно. Платні тарифи з'являться пізніше.")}
            </Text>
          </Alert>
        )}
      </Stack>
    </AccountShell>
  )
}
