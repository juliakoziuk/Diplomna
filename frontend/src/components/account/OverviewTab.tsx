import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Alert, Badge, Button, Card, Group, Progress, SimpleGrid, Stack, Text, Title } from "@mantine/core"
import { IconAlertCircle, IconExternalLink } from "@tabler/icons-react"
import { BillingOverview, billingApi, formatDate } from "../../api/account"
import { tr, useI18n } from "../../i18n"

const statusOf = (): Record<BillingOverview["status"], { label: string; color: string }> => ({
  active: { label: tr("Active", "Активна"), color: "green" },
  trialing: { label: tr("Trial", "Пробний період"), color: "blue" },
  past_due: { label: tr("Payment failed", "Оплата не пройшла"), color: "red" },
  unpaid: { label: tr("Unpaid", "Не оплачено"), color: "red" },
  incomplete: { label: tr("Awaiting payment", "Очікує оплати"), color: "yellow" },
  canceled: { label: tr("Cancelled", "Скасовано"), color: "gray" },
})

interface Props {
  overview: BillingOverview
  onChange: (o: BillingOverview) => void
}

export default function OverviewTab({ overview: o, onChange }: Props) {
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name)
    setError(null)
    try {
      await fn()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  const openPortal = () => run("portal", async () => window.location.assign((await billingApi.portal()).url))
  const cancel = () => run("cancel", async () => { onChange(await billingApi.cancel()); setConfirmCancel(false) })
  const resume = () => run("resume", async () => onChange(await billingApi.resume()))

  const paid = o.plan !== "free"
  const limit = o.usage.anchorsLimit
  const used = o.usage.anchorsThisMonth
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0
  const status = o.cancelAtPeriodEnd ? { label: t(`Active until ${formatDate(o.currentPeriodEnd)}`, `Діє до ${formatDate(o.currentPeriodEnd)}`), color: "orange" } : statusOf()[o.status]

  return (
    <Stack spacing="md">
      {error && (
        <Alert color="red" icon={<IconAlertCircle size="1rem" />} withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {o.status === "past_due" && (
        <Alert color="red" title={t("Payment could not be collected", "Не вдалося списати оплату")}>
          {t("Update your card in the billing portal, otherwise your plan will revert to Free.", "Оновіть картку в розділі керування оплатою, інакше тариф повернеться до Free.")}
        </Alert>
      )}

      <SimpleGrid cols={2} breakpoints={[{ maxWidth: "sm", cols: 1 }]}>
        <Card withBorder padding="lg">
          <Stack spacing="xs">
            <Text fz="xs" tt="uppercase" c="dimmed" fw={600}>{t("Plan", "Тариф")}</Text>
            <Group spacing="sm">
              <Title order={2}>{o.planName}</Title>
              <Badge color={status.color}>{status.label}</Badge>
            </Group>
            <Text fz="sm" c="dimmed">
              {!paid
                ? t("The free plan, no card needed.", "Безкоштовний тариф без картки.")
                : o.cancelAtPeriodEnd
                  ? t(`Subscription cancelled. After ${formatDate(o.currentPeriodEnd)} your plan changes to Free and you will not be charged again.`, `Підписку скасовано. Після ${formatDate(o.currentPeriodEnd)} тариф зміниться на Free, списань більше не буде.`)
                  : t(`Next charge on ${formatDate(o.currentPeriodEnd)}.`, `Наступне списання ${formatDate(o.currentPeriodEnd)}.`)}
            </Text>
            <Group spacing="xs" mt="xs">
              <Button onClick={() => navigate("/pricing")}>{paid ? t("Change plan", "Змінити тариф") : t("Subscribe", "Оформити тариф")}</Button>
              {o.hasPaymentAccount && (
                <Button variant="default" loading={busy === "portal"} rightIcon={<IconExternalLink size="0.9rem" />} onClick={openPortal}>
                  {t("Card and invoices", "Картка і рахунки")}
                </Button>
              )}
              {paid && o.cancelAtPeriodEnd && (
                <Button variant="light" color="green" loading={busy === "resume"} onClick={resume}>{t("Resume subscription", "Відновити підписку")}</Button>
              )}
              {paid && !o.cancelAtPeriodEnd && !confirmCancel && (
                <Button variant="subtle" color="red" onClick={() => setConfirmCancel(true)}>{t("Cancel", "Скасувати")}</Button>
              )}
            </Group>
            {confirmCancel && (
              <Alert color="red" mt="xs">
                <Text fz="sm" mb="xs">
                  {t(`Your plan stays active until ${formatDate(o.currentPeriodEnd)}, then changes to Free. Cancel the subscription?`, `Тариф діятиме до ${formatDate(o.currentPeriodEnd)}, потім зміниться на Free. Скасувати підписку?`)}
                </Text>
                <Group spacing="xs">
                  <Button color="red" size="xs" loading={busy === "cancel"} onClick={cancel}>{t("Yes, cancel", "Так, скасувати")}</Button>
                  <Button variant="default" size="xs" onClick={() => setConfirmCancel(false)}>{t("Keep it", "Залишити")}</Button>
                </Group>
              </Alert>
            )}
          </Stack>
        </Card>

        <Card withBorder padding="lg">
          <Stack spacing="xs">
            <Text fz="xs" tt="uppercase" c="dimmed" fw={600}>{t(`Usage since ${formatDate(o.usage.periodStart)}`, `Використання з ${formatDate(o.usage.periodStart)}`)}</Text>
            <Group spacing={6} align="baseline">
              <Title order={2}>{used.toLocaleString(locale)}</Title>
              <Text c="dimmed">{limit === null ? t("documents, unlimited", "документів, без ліміту") : t(`of ${limit.toLocaleString(locale)} documents`, `з ${limit.toLocaleString(locale)} документів`)}</Text>
            </Group>
            {limit !== null && <Progress value={pct} color={pct >= 90 ? "red" : pct >= 70 ? "yellow" : "orange"} size="lg" />}
            <Text fz="sm" c="dimmed">
              {limit === null
                ? t("The counter resets on the first day of each month.", "Лічильник скидається першого числа кожного місяця.")
                : used >= limit
                  ? t("Limit reached: new documents are not accepted until next month or until you change plan.", "Ліміт вичерпано: нові документи не приймаються до наступного місяця або до зміни тарифу.")
                  : t(`${(limit - used).toLocaleString(locale)} left. The counter resets on the first of the month.`, `Залишилось ${(limit - used).toLocaleString(locale)}. Лічильник скидається першого числа.`)}
            </Text>
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  )
}
