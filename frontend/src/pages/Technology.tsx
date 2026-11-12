import { useCallback, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Accordion, Box, Button, Code, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core"
import AccountShell from "../layouts/AccountShell"
import DocumentsTab from "../components/account/DocumentsTab"
import Playground from "../product/Playground"
import VerifySection from "../product/VerifySection"
import Calculator from "../product/Calculator"
import MethodsSection from "../product/MethodsSection"
import { dist, serve, short, stats, verify } from "../product/sim"
import { useUserStore } from "../stores/userStore"
import { useGeneralStore } from "../stores/generalStore"
import { API_URL_DISPLAY } from "../api/http"
import { useI18n } from "../i18n"
import "../product/product.css"

/**
 * Technical page for developers, auditors and the thesis committee: the live
 * simulation, the verifier, the method comparison and the API. The marketing
 * landing (Product.tsx) deliberately has none of this.
 */

type T = (en: string, uk: string) => string

const sectionsOf = (t: T) => [
  ["playground", t("Demo", "Демо")], ["anchor", t("Recording", "Анкорування")], ["verify", t("Verification", "Перевірка")],
  ["methods", t("Methods", "Методи")], ["api", "API"], ["faq", "FAQ"],
] as const

const faqOf = (t: T) => [
  [t("Does my data go onto the blockchain?", "Чи потрапляють мої дані в блокчейн?"),
   t("No. Only a 32-byte Merkle root and a version number are written to Polygon. Documents and vectors stay in your storage, and to record a file only its SHA-256 goes to the server.",
     "Ні. У Polygon записується лише 32-байтовий корінь дерева Меркла і номер версії. Документи й вектори залишаються у вашому сховищі, а для фіксації файлу на сервер іде лише його SHA-256.")],
  [t("Does this guarantee the exact k nearest were found?", "Це гарантує, що знайдено точних k найближчих?"),
   t("The guarantee holds relative to the nprobe parameter: nothing was missed among the probed clusters, and the clusters themselves were chosen honestly. For exact search set nprobe equal to the number of clusters.",
     "Гарантія діє відносно параметра nprobe: серед перевірених кластерів нічого не пропущено, а самі кластери обрано чесно. Для точного пошуку можна поставити nprobe рівним кількості кластерів.")],
  [t("Who needs to be trusted here?", "Кому тут треба довіряти?"),
   t("The data owner builds the index and signs the anchor with their own key. The server that answers queries does not need to be trusted. For Enterprise the indexer key can be a multisig.",
     "Власник даних будує індекс і підписує анкор своїм ключем. Серверу, що відповідає на запити, довіряти не потрібно. Для Enterprise ключ індексатора можна зробити multisig.")],
  [t("How much does this slow search down?", "Наскільки це сповільнює пошук?"),
   t("The server additionally assembles a proof, and the client recomputes a few dozen distances and hashes: milliseconds. The main cost is proof size, which is why the ring method is used.",
     "Сервер додатково збирає доказ, клієнт перераховує кілька десятків відстаней і хешів, це мілісекунди. Основна ціна — розмір доказу, тому використовується кільцевий метод.")],
  [t("What happens if AnchorProof disappears?", "Що буде, якщо AnchorProof зникне?"),
   t("Receipts will keep verifying: the verifier is open, and the roots live in a public contract.",
     "Квитанції продовжать перевірятися: верифікатор відкритий, а корені лежать у публічному контракті.")],
]

function HeroReceipt() {
  const { t } = useI18n()
  const r = useMemo(() => {
    const q = { x: 0.44, y: 0.47 }
    const b = serve(q, 4, 2, "B", "none")
    return { q, b, ok: verify(b, q, 4).accepted, kb: stats(b).kb }
  }, [])
  const row = (a: string, c: string) => <div className="row" key={a}><span>{a}</span><span>{c}</span></div>
  return (
    <div className="ap-receipt" aria-label={t("Sample search receipt", "Приклад квитанції пошуку")}>
      <div className="rh">{t("SEARCH RECEIPT", "КВИТАНЦІЯ ПОШУКУ")}</div>
      {row(t("query", "запит"), "q = (0.44, 0.47)")}
      {row("k / nprobe", t("4 / 2 of 6", "4 / 2 з 6"))}
      <hr />
      {r.b.results.map((x, i) => row(`${i + 1}. ${x.id}`, `d = ${dist(r.q, x).toFixed(3)}`))}
      <hr />
      {row(t("method", "метод"), t("ring range", "кільцевий діапазон"))}
      {row(t("proof", "доказ"), `${r.kb.toFixed(1)} ${t("KB", "КБ")}`)}
      {row("globalRoot", short(r.b.root))}
      {row(t("index version", "версія індексу"), `v${r.b.version} · latest`)}
      {row(t("network", "мережа"), t("Polygon (demo)", "Polygon (демо)"))}
      <div className="stamp">{r.ok ? t("COMPLETENESS CONFIRMED", "ПОВНОТУ ПІДТВЕРДЖЕНО") : t("REJECTED", "ВІДХИЛЕНО")}</div>
    </div>
  )
}

function Section({ id, eyebrow, title, lede, children }: { id: string; eyebrow: string; title: string; lede?: string; children: React.ReactNode }) {
  return (
    <Box component="section" id={id} pt={56} sx={{ scrollMarginTop: 72 }}>
      <Stack spacing={6} mb="lg">
        <Text fz="xs" tt="uppercase" c="dimmed" fw={600} ff="monospace" sx={{ letterSpacing: "0.08em" }}>{eyebrow}</Text>
        <Title order={2}>{title}</Title>
        {lede && <Text c="dimmed" maw={720}>{lede}</Text>}
      </Stack>
      {children}
    </Box>
  )
}

export default function Technology() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const userId = useUserStore((s) => s.id)
  const toggleLogin = useGeneralStore((s) => s.toggleLoginModal)
  const [params, setParams] = useState({ k: 4, nprobe: 2 })
  const [receiptText, setReceiptText] = useState("")
  const verifyRef = useRef<HTMLDivElement>(null)

  const onParams = useCallback((k: number, nprobe: number) => setParams({ k, nprobe }), [])
  const sendToVerifier = useCallback((json: string) => {
    setReceiptText(json)
    document.getElementById("verify")?.scrollIntoView({ behavior: "smooth" })
  }, [])

  return (
    <AccountShell>
      <Group spacing={4} mb="md" sx={{ overflowX: "auto", flexWrap: "nowrap" }}>
        {sectionsOf(t).map(([id, label]) => (
          <Button key={id} component="a" href={`#${id}`} variant="subtle" color="gray" size="xs">{label}</Button>
        ))}
      </Group>

      <SimpleGrid cols={2} spacing={48} breakpoints={[{ maxWidth: "md", cols: 1 }]} sx={{ alignItems: "center" }} py="lg">
        <Stack spacing="lg">
          <Text fz="xs" tt="uppercase" c="dimmed" fw={600} ff="monospace">{t("For developers and technical specialists", "Для розробників і технічних спеціалістів")}</Text>
          <Title order={1} sx={{ fontSize: "clamp(2rem, 4.4vw, 3rem)", lineHeight: 1.15 }}>{t("How it works inside", "Як це працює всередині")}</Title>
          <Text fz="lg" c="dimmed">
            {t("An authenticated IVF index, Merkle trees, ring proofs of completeness and root anchoring on Polygon. Below: a live simulation, the open verifier, a comparison of methods and the API. Product overview without technical details: ",
               "Автентифікований IVF-індекс, дерева Меркла, кільцеві докази повноти та анкорування кореня в Polygon. Нижче: жива симуляція, відкритий верифікатор, порівняння методів та API. Огляд продукту без технічних деталей: ")}<Link to="/product">{t("home page", "головна сторінка")}</Link>.
          </Text>
          <Group spacing="sm">
            <Button component="a" href="#playground">{t("Try the demo", "Спробувати демо")}</Button>
            <Button variant="default" onClick={() => navigate("/verifiable-search")}>{t("Demo on the real backend", "Демо на справжньому бекенді")}</Button>
            <Button variant="default" component="a" href="/docs" target="_blank">Swagger API</Button>
          </Group>
        </Stack>
        <Group position="center"><HeroReceipt /></Group>
      </SimpleGrid>

      <Section id="playground" eyebrow={t("Demo · Verifiable Search", "Демо · Verifiable Search")} title={t("Try to fool the client", "Спробуйте обманути клієнта")}
        lede={t("A visual 2D simulation in the browser: 150 documents, 6 IVF clusters, real Merkle trees and real verification. Method B also works on the real backend: see the “Demo on the real backend” button above.",
                "Наочна 2D-симуляція у браузері: 150 документів, 6 IVF-кластерів, справжні дерева Меркла і справжня перевірка. Метод B працює і на справжньому бекенді: кнопка «Демо на справжньому бекенді» вище.")}>
        <Playground onParams={onParams} onSendReceipt={sendToVerifier} />
      </Section>

      <Section id="anchor" eyebrow="Anchor API" title={t("Record a document", "Зафіксуйте документ")}
        lede={t("The file never leaves the browser: only the SHA-256 goes to the server. The hash joins a batch, and once the epoch closes you get a receipt with a Merkle proof.",
                "Файл не покидає браузер: на сервер іде лише SHA-256. Хеш потрапляє в батч, після закриття епохи ви отримуєте квитанцію з доказом Меркла.")}>
        {userId ? (
          <Stack spacing="lg">
            <DocumentsTab onUsageChange={() => undefined} />
            <Calculator />
          </Stack>
        ) : (
          <Stack spacing="lg">
            <Paper withBorder p="lg" radius="md">
              <Group position="apart">
                <Stack spacing={4}>
                  <Text fw={600}>{t("Sign in to record documents", "Увійдіть, щоб фіксувати документи")}</Text>
                  <Text fz="sm" c="dimmed">{t("The Free plan gives 100 documents a month with no card.", "Тариф Free дає 100 документів на місяць без картки.")}</Text>
                </Stack>
                <Button onClick={toggleLogin}>{t("Sign in or sign up", "Увійти або зареєструватись")}</Button>
              </Group>
            </Paper>
            <Calculator />
          </Stack>
        )}
      </Section>

      <Section id="verify" eyebrow={t("Open verifier", "Відкритий верифікатор")} title={t("Verify a receipt", "Перевірте квитанцію")}
        lede={t("Supported: document receipts from your account, responses of the real search /verifiable-search, and receipts from the demo.",
                "Підтримуються квитанції документів з кабінету, відповіді реального пошуку /verifiable-search і квитанції з демо.")}>
        <div ref={verifyRef}><VerifySection text={receiptText} onText={setReceiptText} /></div>
      </Section>

      <Section id="methods" eyebrow={t("Under the hood", "Під капотом")} title={t("Four ways to prove completeness", "Чотири методи довести повноту")}
        lede={t("All methods guarantee completeness relative to nprobe. The numbers are computed on the same data as the demo, with its current k and nprobe.",
                "Усі методи гарантують повноту відносно nprobe. Цифри рахуються на тих самих даних, що й демо, з його поточними k і nprobe.")}>
        <MethodsSection k={params.k} nprobe={params.nprobe} />
      </Section>

      <Section id="api" eyebrow={t("Integration", "Інтеграція")} title="API" lede={t("The full description of every endpoint is in Swagger (/docs on the backend).", "Повний опис усіх ендпоінтів — у Swagger (/docs на бекенді).")}>
        <Paper withBorder p="lg" radius="md">
          <Text fw={600} mb="xs">{t("Record a document hash", "Зафіксувати хеш документа")}</Text>
          <Code block>{`curl -X POST ${API_URL_DISPLAY}/v1/anchor \\
  -H "Authorization: Bearer ap_test_…" \\
  -H "Content-Type: application/json" \\
  -d '{"sha256":"<64 hex>","label":"contract.pdf"}'`}</Code>
          <Text fz="xs" c="dimmed" mt="xs">{t("Create the key in your account, on the “API keys” tab.", "Ключ створюється в кабінеті, вкладка «API-ключі».")}</Text>
        </Paper>
      </Section>

      <Section id="faq" eyebrow={t("Questions", "Питання")} title={t("Technical questions", "Технічні питання")}>
        <Accordion variant="separated">
          {faqOf(t).map(([q, a]) => (
            <Accordion.Item key={q} value={q}>
              <Accordion.Control>{q}</Accordion.Control>
              <Accordion.Panel><Text c="dimmed">{a}</Text></Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Section>
    </AccountShell>
  )
}
