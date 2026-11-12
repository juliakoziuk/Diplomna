import { useEffect, useState } from "react"
import {
  Alert, Anchor, Badge, Box, Button, Card, Code, Group, Loader, Stack, Text, Textarea, ThemeIcon, Title,
} from "@mantine/core"
import { Dropzone } from "@mantine/dropzone"
import { IconAlertCircle, IconCheck, IconFileText, IconMinus, IconShieldCheck, IconShieldX, IconUpload, IconX } from "@tabler/icons-react"
import AccountShell from "../layouts/AccountShell"
import { CheckLine, Verdict, checkReceipt, parseReceipt, sha256Hex } from "../receipts/check"
import { networkLabel } from "../receipts/chains"
import { useI18n } from "../i18n"

const TONE = {
  ok: { color: "green", Icon: IconShieldCheck },
  partial: { color: "yellow", Icon: IconShieldCheck },
  fail: { color: "red", Icon: IconShieldX },
} as const

function LineIcon({ status }: { status: CheckLine["status"] }) {
  if (status === "ok") return <ThemeIcon size={22} radius="xl" color="green"><IconCheck size="0.9rem" /></ThemeIcon>
  if (status === "fail") return <ThemeIcon size={22} radius="xl" color="red"><IconX size="0.9rem" /></ThemeIcon>
  return <ThemeIcon size={22} radius="xl" color="gray" variant="light"><IconMinus size="0.9rem" /></ThemeIcon>
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Stack spacing="sm">
        <Group spacing="sm">
          <ThemeIcon size={28} radius="xl" color="orange"><Text fw={700} fz="sm">{n}</Text></ThemeIcon>
          <Text fw={600}>{title}</Text>
        </Group>
        {children}
      </Stack>
    </Card>
  )
}

/** Public page: no sign-in. The file is hashed in the browser and never uploaded. */
export default function Verify() {
  const { t, lang } = useI18n()
  const [file, setFile] = useState<{ name: string; hash: string } | null>(null)
  const [receiptText, setReceiptText] = useState("")
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = () => { setVerdict(null); setError(null) }
  // A verdict is written in the language it was produced in, so drop it when the language changes.
  useEffect(() => { setVerdict(null); setError(null) }, [lang])

  const onFile = async (files: File[]) => {
    reset()
    const f = files[0]
    if (f) setFile({ name: f.name, hash: await sha256Hex(f) })
  }

  const onReceiptFile = async (files: File[]) => {
    reset()
    if (files[0]) setReceiptText(await files[0].text())
  }

  const run = async () => {
    reset()
    setBusy(true)
    try {
      setVerdict(await checkReceipt(parseReceipt(receiptText), file?.hash ?? null))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const tone = verdict ? TONE[verdict.state] : null

  return (
    <AccountShell>
      <Stack spacing="xl" maw={760} mx="auto">
        <Stack spacing={6}>
          <Title order={1}>{t("Verify a document", "Перевірити документ")}</Title>
          <Text c="dimmed">
            {t("Make sure a document has not been changed since it was recorded. No sign-in is needed, and the file itself is never uploaded: the check happens in your browser.",
               "Переконайтеся, що документ не змінювали з моменту фіксації. Вхід не потрібен, а сам файл нікуди не завантажується: перевірка відбувається у вашому браузері.")}
          </Text>
        </Stack>

        <Step n="1" title={t("Document file", "Файл документа")}>
          {file ? (
            <Group position="apart">
              <Group spacing="sm">
                <IconFileText size="1.4rem" />
                <Stack spacing={0}>
                  <Text fz="sm" fw={500}>{file.name}</Text>
                  <Text fz="xs" c="dimmed" ff="monospace">{file.hash.slice(0, 24)}…</Text>
                </Stack>
              </Group>
              <Button variant="subtle" color="gray" size="xs" onClick={() => { setFile(null); reset() }}>{t("Remove", "Прибрати")}</Button>
            </Group>
          ) : (
            <Dropzone onDrop={onFile} multiple={false} maxSize={500 * 1024 * 1024}>
              <Group position="center" spacing="md" mih={86} sx={{ pointerEvents: "none" }}>
                <IconUpload size="1.8rem" stroke={1.4} />
                <Stack spacing={2}>
                  <Text fw={500}>{t("Drag a file here or click to choose", "Перетягніть файл або натисніть, щоб обрати")}</Text>
                  <Text fz="sm" c="dimmed">{t("Optional, but without it you cannot prove the file is unchanged.", "Необов'язково, але без нього не можна довести, що файл не змінений.")}</Text>
                </Stack>
              </Group>
            </Dropzone>
          )}
        </Step>

        <Step n="2" title={t("Receipt", "Квитанція")}>
          <Dropzone onDrop={onReceiptFile} multiple={false} accept={["application/json", "text/plain"]} maxSize={1024 * 1024}>
            <Group position="center" spacing="md" mih={70} sx={{ pointerEvents: "none" }}>
              <IconUpload size="1.6rem" stroke={1.4} />
              <Text fw={500}>{t("Upload the receipt file (.json)", "Завантажте файл квитанції (.json)")}</Text>
            </Group>
          </Dropzone>
          <Text fz="sm" c="dimmed" ta="center">{t("or paste the technical data from the receipt", "або вставте технічні дані з квитанції")}</Text>
          <Textarea
            value={receiptText}
            onChange={(e) => { setReceiptText(e.currentTarget.value); reset() }}
            placeholder='{"type":"document-receipt", …}'
            minRows={4}
            autosize
            maxRows={10}
            styles={{ input: { fontFamily: "monospace", fontSize: 12 } }}
          />
        </Step>

        <Button size="md" onClick={run} disabled={!receiptText.trim()} loading={busy}>{t("Verify", "Перевірити")}</Button>

        {error && <Alert color="red" icon={<IconAlertCircle size="1rem" />}>{error}</Alert>}

        {verdict && tone && (
          <Card withBorder padding="lg" radius="md" sx={(t) => ({ borderColor: t.colors[tone.color][6], borderWidth: 2 })}>
            <Stack spacing="md">
              <Group spacing="md" noWrap align="flex-start">
                <ThemeIcon size={44} radius="xl" color={tone.color}><tone.Icon size="1.6rem" /></ThemeIcon>
                <Stack spacing={2}>
                  <Title order={3}>{verdict.headline}</Title>
                  {verdict.state === "partial" && <Text fz="sm" c="dimmed">{t("Add the file in step 1 and verify again to confirm it is unchanged.", "Додайте файл у кроці 1 і перевірте ще раз, щоб підтвердити, що він не змінений.")}</Text>}
                </Stack>
              </Group>

              <Stack spacing="sm">
                {verdict.lines.map((l) => (
                  <Group key={l.title} spacing="sm" noWrap align="flex-start">
                    <LineIcon status={l.status} />
                    <Box>
                      <Text fz="sm" fw={500}>{l.title}</Text>
                      {l.detail && <Text fz="xs" c="dimmed">{l.detail}</Text>}
                    </Box>
                  </Group>
                ))}
              </Stack>

              {verdict.testnet && (
                <Alert color="blue" variant="light" icon={<IconAlertCircle size="1rem" />}>
                  {t("This receipt is anchored in a public test network: anyone can check the record, but a test network is not permanent and carries no legal weight.", "Ця квитанція зафіксована в публічній тестовій мережі: запис може перевірити будь-хто, але тестова мережа не вічна і не має юридичної ваги.")}
                </Alert>
              )}
              {verdict.demoRegistry && (
                <Alert color="orange" variant="light" icon={<IconAlertCircle size="1rem" />}>
                  {lang === "uk" ? <>Це квитанція з <b>демонстраційного реєстру</b>: запис імітується на сервері й поки не в публічному блокчейні.</> : <>This receipt comes from a <b>demo registry</b>: the record is simulated on the server and is not yet on a public blockchain.</>}
                </Alert>
              )}

              <Group spacing="xs">
                <Badge variant="light">{networkLabel(verdict.network)}</Badge>
                <Badge variant="light" color="gray">{t("Batch", "Партія")} {verdict.epoch}</Badge>
                {verdict.explorerTx
                  ? <Anchor href={verdict.explorerTx} target="_blank" fz="sm">{t("View the transaction on the blockchain", "Переглянути транзакцію в блокчейні")}</Anchor>
                  : verdict.txHash && <Code>{verdict.txHash.slice(0, 18)}…</Code>}
              </Group>
            </Stack>
          </Card>
        )}
        {busy && <Group position="center"><Loader size="sm" /></Group>}
      </Stack>
    </AccountShell>
  )
}
