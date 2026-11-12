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
import "../product/product.css"

/**
 * Technical page for developers, auditors and the thesis committee: the live
 * simulation, the verifier, the method comparison and the API. The marketing
 * landing (Product.tsx) deliberately has none of this.
 */

const SECTIONS = [
  ["playground", "Демо"], ["anchor", "Анкорування"], ["verify", "Перевірка"], ["methods", "Методи"], ["api", "API"], ["faq", "FAQ"],
] as const

const FAQ = [
  ["Чи потрапляють мої дані в блокчейн?", "Ні. У Polygon записується лише 32-байтовий корінь дерева Меркла і номер версії. Документи й вектори залишаються у вашому сховищі, а для фіксації файлу на сервер іде лише його SHA-256."],
  ["Це гарантує, що знайдено точних k найближчих?", "Гарантія діє відносно параметра nprobe: серед перевірених кластерів нічого не пропущено, а самі кластери обрано чесно. Для точного пошуку можна поставити nprobe рівним кількості кластерів."],
  ["Кому тут треба довіряти?", "Власник даних будує індекс і підписує анкор своїм ключем. Серверу, що відповідає на запити, довіряти не потрібно. Для Enterprise ключ індексатора можна зробити multisig."],
  ["Наскільки це сповільнює пошук?", "Сервер додатково збирає доказ, клієнт перераховує кілька десятків відстаней і хешів, це мілісекунди. Основна ціна — розмір доказу, тому використовується кільцевий метод."],
  ["Що буде, якщо AnchorProof зникне?", "Квитанції продовжать перевірятися: верифікатор відкритий, а корені лежать у публічному контракті."],
]

function HeroReceipt() {
  const r = useMemo(() => {
    const q = { x: 0.44, y: 0.47 }
    const b = serve(q, 4, 2, "B", "none")
    return { q, b, ok: verify(b, q, 4).accepted, kb: stats(b).kb }
  }, [])
  const row = (a: string, c: string) => <div className="row" key={a}><span>{a}</span><span>{c}</span></div>
  return (
    <div className="ap-receipt" aria-label="Приклад квитанції пошуку">
      <div className="rh">КВИТАНЦІЯ ПОШУКУ</div>
      {row("запит", "q = (0.44, 0.47)")}
      {row("k / nprobe", "4 / 2 з 6")}
      <hr />
      {r.b.results.map((x, i) => row(`${i + 1}. ${x.id}`, `d = ${dist(r.q, x).toFixed(3)}`))}
      <hr />
      {row("метод", "кільцевий діапазон")}
      {row("доказ", `${r.kb.toFixed(1)} КБ`)}
      {row("globalRoot", short(r.b.root))}
      {row("версія індексу", `v${r.b.version} · latest`)}
      {row("мережа", "Polygon (демо)")}
      <div className="stamp">{r.ok ? "ПОВНОТУ ПІДТВЕРДЖЕНО" : "ВІДХИЛЕНО"}</div>
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
        {SECTIONS.map(([id, label]) => (
          <Button key={id} component="a" href={`#${id}`} variant="subtle" color="gray" size="xs">{label}</Button>
        ))}
      </Group>

      <SimpleGrid cols={2} spacing={48} breakpoints={[{ maxWidth: "md", cols: 1 }]} sx={{ alignItems: "center" }} py="lg">
        <Stack spacing="lg">
          <Text fz="xs" tt="uppercase" c="dimmed" fw={600} ff="monospace">Для розробників і технічних спеціалістів</Text>
          <Title order={1} sx={{ fontSize: "clamp(2rem, 4.4vw, 3rem)", lineHeight: 1.15 }}>Як це працює всередині</Title>
          <Text fz="lg" c="dimmed">
            Автентифікований IVF-індекс, дерева Меркла, кільцеві докази повноти та анкорування кореня в Polygon.
            Нижче: жива симуляція, відкритий верифікатор, порівняння методів та API.
            Огляд продукту без технічних деталей: <Link to="/product">головна сторінка</Link>.
          </Text>
          <Group spacing="sm">
            <Button component="a" href="#playground">Спробувати демо</Button>
            <Button variant="default" onClick={() => navigate("/verifiable-search")}>Демо на справжньому бекенді</Button>
            <Button variant="default" component="a" href="/docs" target="_blank">Swagger API</Button>
          </Group>
        </Stack>
        <Group position="center"><HeroReceipt /></Group>
      </SimpleGrid>

      <Section id="playground" eyebrow="Демо · Verifiable Search" title="Спробуйте обманути клієнта"
        lede="Наочна 2D-симуляція у браузері: 150 документів, 6 IVF-кластерів, справжні дерева Меркла і справжня перевірка. Метод B працює і на справжньому бекенді: кнопка «Демо на справжньому бекенді» вище.">
        <Playground onParams={onParams} onSendReceipt={sendToVerifier} />
      </Section>

      <Section id="anchor" eyebrow="Anchor API" title="Зафіксуйте документ"
        lede="Файл не покидає браузер: на сервер іде лише SHA-256. Хеш потрапляє в батч, після закриття епохи ви отримуєте квитанцію з доказом Меркла.">
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
                  <Text fw={600}>Увійдіть, щоб фіксувати документи</Text>
                  <Text fz="sm" c="dimmed">Тариф Free дає 100 анкорів на місяць без картки.</Text>
                </Stack>
                <Button onClick={toggleLogin}>Увійти або зареєструватись</Button>
              </Group>
            </Paper>
            <Calculator />
          </Stack>
        )}
      </Section>

      <Section id="verify" eyebrow="Відкритий верифікатор" title="Перевірте квитанцію"
        lede="Підтримуються квитанції документів з кабінету, відповіді реального пошуку /verifiable-search і квитанції з демо.">
        <div ref={verifyRef}><VerifySection text={receiptText} onText={setReceiptText} /></div>
      </Section>

      <Section id="methods" eyebrow="Під капотом" title="Чотири методи довести повноту"
        lede="Усі методи гарантують повноту відносно nprobe. Цифри рахуються на тих самих даних, що й демо, з його поточними k і nprobe.">
        <MethodsSection k={params.k} nprobe={params.nprobe} />
      </Section>

      <Section id="api" eyebrow="Інтеграція" title="API" lede="Повний опис усіх ендпоінтів — у Swagger (/docs на бекенді).">
        <Paper withBorder p="lg" radius="md">
          <Text fw={600} mb="xs">Зафіксувати хеш документа</Text>
          <Code block>{`curl -X POST http://localhost:3000/v1/anchor \\
  -H "Authorization: Bearer ap_test_…" \\
  -H "Content-Type: application/json" \\
  -d '{"sha256":"<64 hex>","label":"contract.pdf"}'`}</Code>
          <Text fz="xs" c="dimmed" mt="xs">Ключ створюється в кабінеті, вкладка «API-ключі».</Text>
        </Paper>
      </Section>

      <Section id="faq" eyebrow="Питання" title="Технічні питання">
        <Accordion variant="separated">
          {FAQ.map(([q, a]) => (
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
