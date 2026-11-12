import { useEffect, useState } from "react"
import { Alert, Anchor, Badge, Button, Card, Group, Loader, ScrollArea, Stack, Table, Text } from "@mantine/core"
import { IconAlertCircle, IconExternalLink } from "@tabler/icons-react"
import { BillingOverview, Invoice, billingApi, formatDate } from "../../api/account"
import { tr, useI18n } from "../../i18n"

const invoiceStatus = (): Record<string, { label: string; color: string }> => ({
  paid: { label: tr("Paid", "Оплачено"), color: "green" },
  open: { label: tr("Awaiting payment", "Очікує оплати"), color: "yellow" },
  draft: { label: tr("Draft", "Чернетка"), color: "gray" },
  void: { label: tr("Void", "Анульовано"), color: "gray" },
  uncollectible: { label: tr("Uncollectible", "Не стягнуто"), color: "red" },
})

export default function BillingTab({ overview }: { overview: BillingOverview }) {
  const { t } = useI18n()
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    billingApi.invoices().then(setInvoices).catch((e) => setError(e.message))
  }, [])

  const openPortal = async () => {
    setBusy(true)
    try {
      window.location.assign((await billingApi.portal()).url)
    } catch (e: any) {
      setError(e.message)
      setBusy(false)
    }
  }

  const money = (i: Invoice) =>
    new Intl.NumberFormat("uk-UA", { style: "currency", currency: i.currency.toUpperCase() }).format(i.amount)

  return (
    <Stack spacing="md">
      {error && (
        <Alert color="red" icon={<IconAlertCircle size="1rem" />} withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Card withBorder padding="lg">
        <Group position="apart">
          <Stack spacing={2}>
            <Text fw={600}>{t("Payment method", "Спосіб оплати")}</Text>
            <Text fz="sm" c="dimmed">
              {t("Your card, billing details and cancellation are on a secure Stripe page. Card data never reaches us.", "Картка, платіжні дані й скасування доступні на захищеній сторінці Stripe. Дані картки до нас не потрапляють.")}
            </Text>
          </Stack>
          <Button variant="default" disabled={!overview.hasPaymentAccount} loading={busy} rightIcon={<IconExternalLink size="0.9rem" />} onClick={openPortal}>
            {t("Manage billing", "Керувати оплатою")}
          </Button>
        </Group>
      </Card>

      <Card withBorder padding={0}>
        {!invoices ? (
          <Group p="lg"><Loader size="sm" /></Group>
        ) : invoices.length === 0 ? (
          <Text p="lg" c="dimmed">{t("No invoices yet. They will appear after your first payment.", "Рахунків ще немає. Вони з'являться після першої оплати.")}</Text>
        ) : (
          <ScrollArea>
            <Table verticalSpacing="sm" miw={600}>
              <thead><tr><th>{t("Date", "Дата")}</th><th>{t("Number", "Номер")}</th><th>{t("Amount", "Сума")}</th><th>{t("Status", "Статус")}</th><th /></tr></thead>
              <tbody>
                {invoices.map((i) => {
                  const st = invoiceStatus()[i.status] ?? { label: i.status, color: "gray" }
                  return (
                    <tr key={i.id}>
                      <td><Text fz="sm">{formatDate(i.createdAt)}</Text></td>
                      <td><Text fz="sm" ff="monospace">{i.number ?? "—"}</Text></td>
                      <td><Text fz="sm">{money(i)}</Text></td>
                      <td><Badge color={st.color}>{st.label}</Badge></td>
                      <td>
                        <Group spacing="sm" noWrap>
                          {i.hostedUrl && <Anchor href={i.hostedUrl} target="_blank" fz="sm">{t("Open", "Відкрити")}</Anchor>}
                          {i.pdfUrl && <Anchor href={i.pdfUrl} target="_blank" fz="sm">PDF</Anchor>}
                        </Group>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </ScrollArea>
        )}
      </Card>
    </Stack>
  )
}
