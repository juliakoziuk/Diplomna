import { useEffect, useState } from "react"
import { Alert, Badge, Button, Card, Code, CopyButton, Group, Loader, ScrollArea, Stack, Table, Text, TextInput } from "@mantine/core"
import { IconAlertCircle, IconKey } from "@tabler/icons-react"
import { ApiKeyItem, accountApi, formatDateTime } from "../../api/account"
import { API_URL_DISPLAY } from "../../api/http"
import { tr, useI18n } from "../../i18n"

export default function ApiKeysTab() {
  const { t } = useI18n()
  const [keys, setKeys] = useState<ApiKeyItem[] | null>(null)
  const [name, setName] = useState(() => tr("Production server", "Сервер продакшн"))
  const [fresh, setFresh] = useState<ApiKeyItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [revoking, setRevoking] = useState<number | null>(null)

  useEffect(() => {
    accountApi.keys().then(setKeys).catch((e) => setError(e.message))
  }, [])

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      const key = await accountApi.createKey(name.trim())
      setFresh(key)
      setKeys((k) => [key, ...(k ?? [])])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (id: number) => {
    try {
      const key = await accountApi.revokeKey(id)
      setKeys((k) => k?.map((x) => (x.id === id ? key : x)) ?? null)
      setRevoking(null)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const example = `curl -X POST ${API_URL_DISPLAY}/v1/anchor \\
  -H "Authorization: Bearer ${fresh?.secret ?? "ap_test_…"}" \\
  -H "Content-Type: application/json" \\
  -d '{"sha256":"'$(sha256sum contract.pdf | cut -d" " -f1)'","label":"contract.pdf"}'

${t("# the receipt, once the epoch closes", "# квитанція, коли епоха закриється")}
curl ${API_URL_DISPLAY}/v1/anchor/anc_… -H "Authorization: Bearer ${fresh?.secret ?? "ap_test_…"}"`

  return (
    <Stack spacing="md">
      {error && (
        <Alert color="red" icon={<IconAlertCircle size="1rem" />} withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card withBorder padding="lg">
        <Group align="flex-end" spacing="sm">
          <TextInput label={t("Key name", "Назва ключа")} value={name} onChange={(e) => setName(e.currentTarget.value)} maxLength={100} sx={{ flex: 1, minWidth: 200 }} />
          <Button leftIcon={<IconKey size="1rem" />} loading={busy} disabled={!name.trim()} onClick={create}>
            {t("Create key", "Створити ключ")}
          </Button>
        </Group>
        {fresh?.secret && (
          <Alert color="green" mt="md" title={t("Copy the key now", "Скопіюйте ключ зараз")}>
            <Text fz="sm" mb="xs">{t("We store only its hash, so we cannot show the key again.", "Ми зберігаємо лише його хеш, тому повторно показати ключ не зможемо.")}</Text>
            <Group spacing="xs" noWrap>
              <Code sx={{ wordBreak: "break-all" }}>{fresh.secret}</Code>
              <CopyButton value={fresh.secret}>
                {({ copied, copy }) => (
                  <Button size="xs" variant={copied ? "filled" : "light"} color={copied ? "green" : "orange"} onClick={copy}>
                    {copied ? t("Copied", "Скопійовано") : t("Copy", "Копіювати")}
                  </Button>
                )}
              </CopyButton>
            </Group>
          </Alert>
        )}
      </Card>

      <Card withBorder padding={0}>
        {!keys ? (
          <Group p="lg"><Loader size="sm" /></Group>
        ) : keys.length === 0 ? (
          <Text p="lg" c="dimmed">{t("No keys yet.", "Ключів ще немає.")}</Text>
        ) : (
          <ScrollArea>
            <Table verticalSpacing="sm" miw={640}>
              <thead><tr><th>{t("Name", "Назва")}</th><th>{t("Key", "Ключ")}</th><th>{t("Created", "Створено")}</th><th>{t("Last used", "Останнє використання")}</th><th /></tr></thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td><Text fz="sm" fw={500}>{k.name}</Text></td>
                    <td><Code>{k.prefix}…</Code></td>
                    <td><Text fz="sm">{formatDateTime(k.createdAt)}</Text></td>
                    <td><Text fz="sm">{k.lastUsedAt ? formatDateTime(k.lastUsedAt) : t("never used", "ще не використовувався")}</Text></td>
                    <td>
                      {k.revokedAt ? (
                        <Badge color="gray">{t("Revoked", "Відкликано")}</Badge>
                      ) : revoking === k.id ? (
                        <Group spacing={4} noWrap>
                          <Button size="xs" color="red" onClick={() => revoke(k.id)}>{t("Revoke", "Відкликати")}</Button>
                          <Button size="xs" variant="default" onClick={() => setRevoking(null)}>{t("No", "Ні")}</Button>
                        </Group>
                      ) : (
                        <Button size="xs" variant="subtle" color="red" onClick={() => setRevoking(k.id)}>{t("Revoke", "Відкликати")}</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      <Card withBorder padding="lg">
        <Text fw={600} mb="xs">{t("How to send a document through the API", "Як надіслати документ через API")}</Text>
        <Code block>{example}</Code>
      </Card>
    </Stack>
  )
}
