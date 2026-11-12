import { useState } from "react"
import {
  Alert, Badge, Button, Card, Chip, Code, Divider, Group, NumberInput, Stack, Text, TextInput, Title,
} from "@mantine/core"
import {
  BackendMockChainReader, ProofBundle, VerificationResult, embedDemoText, verifySearchResult,
} from "verification-sdk"
import AccountShell from "../layouts/AccountShell"
import StepList from "../product/StepList"
import { API_BASE } from "../api/http"
import { getLang, tr, useI18n } from "../i18n"

interface SearchResponse {
  results: { id: string; text: string; distance: number; clusterId: number }[]
  proofBundle: ProofBundle
  anchor: { version: number; root: string; timestamp: number; txHash: string }
  simulatedAttack?: string
}

const attacksOf = () => [
  { value: "", label: tr("Honest server", "Чесний сервер") },
  { value: "hide", label: tr("Hide the best", "Приховати найкращий") },
  { value: "centroid", label: tr("Swap clusters", "Підмінити кластери") },
  { value: "tamper", label: tr("Forge a vector", "Підробити вектор") },
  { value: "rollback", label: tr("Rollback to an old version", "Rollback на стару версію") },
]

/**
 * Demo screen for backend/src/verifiable-search (protocol ivf-ring-v2):
 * sends a query over REST, then verifies the proof bundle ENTIRELY IN THE
 * BROWSER via verification-sdk, with the query embedded here rather than
 * trusted from the server. The backend never learns whether verification
 * passed — that is the point of the protocol.
 */
export default function VerifiableSearchDemo() {
  const { t } = useI18n()
  const [query, setQuery] = useState("блокчейн анкорування Polygon")
  const [k, setK] = useState(3)
  const [nprobe, setNprobe] = useState(2)
  const [attack, setAttack] = useState("")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SearchResponse | null>(null)
  const [verdict, setVerdict] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runSearch() {
    setLoading(true)
    setError(null)
    setData(null)
    setVerdict(null)
    let json: SearchResponse
    try {
      const res = await fetch(`${API_BASE}/verifiable-search/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, k, nprobe, ...(attack ? { attack } : {}) }),
      })
      json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const body = json as unknown as { message?: unknown }
        throw new Error(body.message ? JSON.stringify(body.message) : `HTTP ${res.status}`)
      }
    } catch (e) {
      setError(t(`The backend is unavailable: ${e instanceof Error ? e.message : "unknown error"}. Start the backend on port 3000: the full one (npm run start:dev) or search only, without a database (npx ts-node -T src/verifiable-search-demo.main.ts in backend/).`, `Бекенд недоступний: ${e instanceof Error ? e.message : "невідома помилка"}. Запустіть бекенд на порту 3000: повний (npm run start:dev) або лише пошук без бази (npx ts-node -T src/verifiable-search-demo.main.ts у backend/).`))
      setLoading(false)
      return
    }
    try {
      setData(json)
      setVerdict(
        await verifySearchResult(json.proofBundle, new BackendMockChainReader(API_BASE), {
          queryVector: embedDemoText(query),
          lang: getLang(),
        }),
      )
    } catch (e) {
      setError(t(`Could not verify the response: ${e instanceof Error ? e.message : "unknown error"}`, `Не вдалося перевірити відповідь: ${e instanceof Error ? e.message : "невідома помилка"}`))
    } finally {
      setLoading(false)
    }
  }

  const bundle = data?.proofBundle
  const revealed = bundle?.ranges.reduce((s, r) => s + r.leaves.length, 0) ?? 0
  const total = bundle?.ranges.reduce((s, r) => s + bundle.centroids[r.clusterId].size, 0) ?? 0

  return (
    <AccountShell>
      <Stack spacing="lg" maw={900}>
        <Stack spacing={6}>
          <Title order={1}>{t("Verified search", "Верифікований пошук")}</Title>
          <Text c="dimmed">
            {t("The query goes to the real backend, and the response is verified here in the browser by the ", "Запит іде на справжній бекенд, а відповідь перевіряється тут, у браузері, бібліотекою ")}<Code>verification-sdk</Code>{t(" library. The browser computes the query vector itself, so the server cannot quietly search for something else. Pick an attack to make the server cheat. The demo corpus is in Ukrainian, so Ukrainian queries give meaningful results.", ". Вектор запиту браузер рахує сам, тому сервер не може непомітно шукати щось інше. Оберіть атаку, щоб сервер схитрував. Демо-корпус українською, тому українські запити дають змістовні результати.")}
          </Text>
        </Stack>

        <Card withBorder padding="lg">
          <Stack>
            <TextInput label={t("Query", "Запит")} value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
            <Group grow>
              <NumberInput label={t("k, how many results", "k, скільки результатів")} min={1} max={20} value={k} onChange={(v) => setK(Number(v) || 1)} />
              <NumberInput label={t("nprobe, how many clusters", "nprobe, скільки кластерів")} min={1} max={6} value={nprobe} onChange={(v) => setNprobe(Number(v) || 1)} />
            </Group>
            <Stack spacing={6}>
              <Text fz="sm" fw={500}>{t("Server behavior", "Поведінка сервера")}</Text>
              <Chip.Group value={attack} onChange={(v) => setAttack(v as string)}>
                <Group spacing={6}>
                  {attacksOf().map((a) => (
                    <Chip key={a.value} value={a.value} color={a.value ? "red" : "green"}>{a.label}</Chip>
                  ))}
                </Group>
              </Chip.Group>
            </Stack>
            <Button onClick={runSearch} loading={loading}>{t("Run the query and verify", "Виконати запит і перевірити")}</Button>
            {error && <Alert color="red" title={t("Error", "Помилка")}>{error}</Alert>}
          </Stack>
        </Card>

        {data && verdict && (
          <>
            <Alert color={verdict.valid ? "green" : "red"} title={verdict.valid ? t("Response confirmed", "Відповідь підтверджено") : t("Response rejected", "Відповідь відхилено")}>
              {verdict.valid
                ? t("The root matched the anchor, the index is the latest, the clusters were chosen honestly and nothing was hidden.", "Корінь збігся з анкором, індекс найсвіжіший, кластери обрано чесно і нічого не приховано.")
                : `${data.simulatedAttack ? t("The server cheated and the client noticed: ", "Сервер схитрував, і клієнт це помітив: ") : ""}${verdict.reason}`}
            </Alert>
            <StepList steps={verdict.steps.map((s) => ({ label: s.label, status: s.ok ? "ok" : "fail", detail: s.detail }))} />

            <Card withBorder padding="lg">
              <Text fw={600} mb="xs">{t("Results", "Результати")}</Text>
              <Stack spacing="xs">
                {data.results.map((r, i) => (
                  <Group key={r.id} position="apart" noWrap>
                    <Text size="sm" sx={{ flex: 1 }}>{i + 1}. {r.text}</Text>
                    <Badge variant="light">{t("cluster", "кластер")} {r.clusterId}</Badge>
                    <Code>{r.distance.toFixed(3)}</Code>
                  </Group>
                ))}
              </Stack>
              <Divider my="sm" />
              <Text size="xs" c="dimmed">
                {t(`Index version ${bundle!.indexVersion}, probed clusters ${bundle!.ranges.map((r) => r.clusterId).join(", ")}, ${revealed} of ${total} vectors in them revealed, ${bundle!.ranges.reduce((s, r) => s + r.nodes.length, 0)} proof nodes.`,
                   `Версія індексу ${bundle!.indexVersion}, пробовані кластери ${bundle!.ranges.map((r) => r.clusterId).join(", ")}, розкрито ${revealed} з ${total} векторів у них, вузлів доказу ${bundle!.ranges.reduce((s, r) => s + r.nodes.length, 0)}.`)}
                {" "}{t("Anchor (mock MerkleAnchor.sol): tx", "Анкор (mock MerkleAnchor.sol): tx")} <Code>{data.anchor.txHash.slice(0, 18)}…</Code>
              </Text>
            </Card>
          </>
        )}
      </Stack>
    </AccountShell>
  )
}
