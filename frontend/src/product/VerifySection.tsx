import { useState } from "react"
import { Alert, Button, CopyButton, Grid, Group, Stack, Text, Textarea } from "@mantine/core"
import { BackendMockChainReader, ProofBundle, hashLeaf, verifyInclusionProof, verifySearchResult } from "verification-sdk"
import StepList, { StepItem } from "./StepList"
import { verifyReceipt, SearchReceipt } from "./sim"
import { API_BASE, post } from "../api/http"
import { accountApi, DocumentReceipt } from "../api/account"
import { getLang, tr, useI18n } from "../i18n"

interface Outcome { ok: boolean; title: string; steps: StepItem[] }

/** Document receipts from the Anchor API: Merkle proof here, root read back from the anchor registry. */
async function checkDocument(r: DocumentReceipt): Promise<Outcome> {
  const steps: StepItem[] = []
  const leafOk = hashLeaf(r.sha256).toLowerCase() === String(r.leaf).toLowerCase()
  steps.push({ label: tr("The receipt leaf matches the document SHA-256", "Лист квитанції відповідає SHA-256 документа"), status: leafOk ? "ok" : "fail", detail: r.leafRule })
  const proofOk = leafOk && verifyInclusionProof(r.leaf, r.siblings, r.batchRoot)
  steps.push({ label: tr("The document is part of the epoch batch", "Документ входить у батч епохи"), status: proofOk ? "ok" : "fail", detail: tr(`epoch ${r.epoch}, ${r.siblings.length} proof hashes`, `епоха ${r.epoch}, ${r.siblings.length} хешів доказу`) })
  try {
    const anchor = await accountApi.chainRoot(r.epoch, r.network)
    const same = anchor.root.toLowerCase() === r.batchRoot.toLowerCase()
    steps.push({ label: tr("The root matches the anchor", "Корінь збігається з анкором"), status: same ? "ok" : "fail", detail: tr(`version ${r.epoch}, tx ${(anchor.txHash ?? r.txHash).slice(0, 12)}…`, `версія ${r.epoch}, tx ${(anchor.txHash ?? r.txHash).slice(0, 12)}…`) })
  } catch {
    steps.push({
      label: tr("The root matches the anchor", "Корінь збігається з анкором"),
      status: "fail",
      detail: tr("the anchor is unavailable: no record for this epoch in the registry", "анкор недоступний: у реєстрі немає запису цієї епохи"),
    })
  }
  const ok = steps.every((s) => s.status === "ok")
  return { ok, title: ok ? tr(`Document confirmed: it existed no later than epoch ${r.epoch}`, `Документ підтверджено: існував не пізніше епохи ${r.epoch}`) : tr("Receipt rejected", "Квитанцію відхилено"), steps }
}

/** Real search responses from backend/src/verifiable-search (ivf-ring-v2), checked by the SDK. */
async function checkRealSearch(bundle: ProofBundle): Promise<Outcome> {
  const verdict = await verifySearchResult(bundle, new BackendMockChainReader(API_BASE), { lang: getLang() })
  return {
    ok: verdict.valid,
    title: verdict.valid ? tr("Server response confirmed: completeness proven by the ring proof", "Відповідь сервера підтверджено: повноту доведено кільцевим доказом") : tr("Response rejected", "Відповідь відхилено"),
    steps: verdict.steps.map((s) => ({ label: s.label, status: s.ok ? "ok" : "fail", detail: s.detail })),
  }
}

function checkSimulated(o: SearchReceipt): Outcome {
  const v = verifyReceipt(o)
  return {
    ok: v.accepted,
    title: v.accepted ? tr(`Completeness confirmed (simulation, method ${o.method})`, `Повноту підтверджено (симуляція, метод ${o.method})`) : tr("Receipt rejected", "Квитанцію відхилено"),
    steps: v.steps,
  }
}

export default function VerifySection({ text, onText }: { text: string; onText: (t: string) => void }) {
  const { t } = useI18n()
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (raw = text) => {
    setError(null)
    setOutcome(null)
    let o: any
    try {
      o = JSON.parse(raw)
    } catch {
      setError(t("This does not look like JSON. Check the brackets and quotes.", "Це не схоже на JSON. Перевірте дужки й лапки."))
      return
    }
    setBusy(true)
    try {
      if (o?.type === "document-receipt") setOutcome(await checkDocument(o))
      else if (o?.type === "simulated-search-receipt") setOutcome(checkSimulated(o))
      else if (o?.proofBundle?.protocol || o?.protocol) setOutcome(await checkRealSearch(o.proofBundle ?? o))
      else setError(t("Unknown format. Supported: document receipts, /verifiable-search/search responses and demo receipts.", "Невідомий формат. Підтримуються квитанції документів, відповіді /verifiable-search/search і квитанції з демо."))
    } catch (e: any) {
      setError(t(`The receipt is damaged: ${e.message}`, `Квитанція пошкоджена: ${e.message}`))
    } finally {
      setBusy(false)
    }
  }

  const loadRealSearch = async () => {
    setError(null)
    try {
      const res = await post<unknown>("/verifiable-search/search", { query: "блокчейн анкорування", k: 3, nprobe: 2 })
      const json = JSON.stringify(res, null, 2)
      onText(json)
      run(json)
    } catch (e: any) {
      setError(t(`The search backend is unavailable: ${e.message}`, `Бекенд пошуку недоступний: ${e.message}`))
    }
  }

  return (
    <Grid gutter="lg">
      <Grid.Col md={6}>
        <Stack spacing="sm">
          <Textarea
            value={text}
            onChange={(e) => onText(e.currentTarget.value)}
            minRows={14}
            maxRows={14}
            autosize
            styles={{ input: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 } }}
            placeholder={t("Paste the receipt JSON", "Вставте JSON квитанції")}
            aria-label={t("Receipt JSON", "JSON квитанції")}
          />
          <Group spacing="xs">
            <Button onClick={() => run()} loading={busy}>{t("Verify", "Перевірити")}</Button>
            <Button variant="default" onClick={loadRealSearch}>{t("Example: real search", "Приклад: реальний пошук")}</Button>
            <CopyButton value={text}>
              {({ copied, copy }) => <Button variant="subtle" onClick={copy}>{copied ? t("Copied", "Скопійовано") : t("Copy", "Копіювати")}</Button>}
            </CopyButton>
          </Group>
        </Stack>
      </Grid.Col>
      <Grid.Col md={6}>
        <Stack spacing="sm">
          {error && <Alert color="red">{error}</Alert>}
          {outcome && <Alert color={outcome.ok ? "green" : "red"} title={outcome.title}>{t("Change any digit in the JSON and verify again.", "Змініть будь-яку цифру в JSON і перевірте ще раз.")}</Alert>}
          {outcome && <StepList steps={outcome.steps} />}
          {!error && !outcome && (
            <Text c="dimmed" fz="sm">
              {t("The check runs in your browser with the verification-sdk library. A document receipt can be taken from your account, a search receipt from the demo above.", "Перевірка виконується у вашому браузері бібліотекою verification-sdk. Квитанцію документа можна взяти в кабінеті, квитанцію пошуку — з демо вище.")}
            </Text>
          )}
        </Stack>
      </Grid.Col>
    </Grid>
  )
}
