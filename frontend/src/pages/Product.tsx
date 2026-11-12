import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Accordion, Badge, Box, Button, Card, Group, List, SimpleGrid, Stack, Text, ThemeIcon, Title,
} from "@mantine/core"
import {
  IconBuildingBank, IconCheck, IconFileCheck, IconRobot, IconScale, IconSearch, IconStethoscope, IconUsers, IconPalette,
} from "@tabler/icons-react"
import AccountShell from "../layouts/AccountShell"
import { Plan, billingApi } from "../api/account"
import { useUserStore } from "../stores/userStore"
import { useGeneralStore } from "../stores/generalStore"
import { useI18n } from "../i18n"
import { planFeatures, planLimit } from "../i18n/plans"
import "../product/product.css"

/**
 * Marketing landing for non-technical buyers: what the service does, who needs
 * it and what it costs, in plain words. No cryptography terms here; the
 * technical side lives on /technology.
 */

function SampleCertificate() {
  const { t, locale } = useI18n()
  const today = new Date().toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
  const row = (a: string, c: string) => <div className="row" key={a}><span>{a}</span><span>{c}</span></div>
  return (
    <div className="ap-receipt" aria-label={t("Sample receipt", "Приклад квитанції")}>
      <div className="rh">{t("RECEIPT · EXAMPLE", "КВИТАНЦІЯ · ПРИКЛАД")}</div>
      {row(t("File", "Файл"), t("supply_contract.pdf", "договір_постачання.pdf"))}
      {row(t("Recorded", "Зафіксовано"), today)}
      <hr />
      {row(t("Changed since then?", "Змінювався з того часу?"), t("No", "Ні"))}
      {row(t("Who can verify", "Хто може перевірити"), t("Anyone", "Будь-хто"))}
      {row(t("Our involvement needed", "Потрібна наша участь"), t("No", "Ні"))}
      <div className="stamp">{t("NOT CHANGED", "НЕ ЗМІНЮВАЛИ")}</div>
    </div>
  )
}

function Section({ id, eyebrow, title, lede, children }: { id: string; eyebrow: string; title: string; lede?: string; children: React.ReactNode }) {
  return (
    <Box component="section" id={id} pt={64} sx={{ scrollMarginTop: 72 }}>
      <Stack spacing={6} mb="lg">
        <Text fz="xs" tt="uppercase" c="dimmed" fw={600} sx={{ letterSpacing: "0.08em" }}>{eyebrow}</Text>
        <Title order={2}>{title}</Title>
        {lede && <Text c="dimmed" maw={720}>{lede}</Text>}
      </Stack>
      {children}
    </Box>
  )
}

export default function Product() {
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const userId = useUserStore((s) => s.id)
  const openAuth = useGeneralStore((s) => s.openAuth)
  const [plans, setPlans] = useState<Plan[] | null>(null)

  useEffect(() => { billingApi.plans().then(setPlans).catch(() => setPlans([])) }, [])

  const start = () => (userId ? navigate("/account") : openAuth("register"))

  const situations = [
    [t("“We signed a different version of the contract”", "«Ми підписали іншу версію договору»"),
     t("A year later the parties argue about which text was signed. The receipt shows that this exact file existed on this day and has not changed since.",
       "Через рік сторони сперечаються, який саме текст було підписано. Квитанція показує, що цей файл існував у цей день і відтоді не змінювався.")],
    [t("“Show that the search was complete”", "«Покажіть, що пошук був повним»"),
     t("An auditor or regulator asks: did the system really check every record? We confirm that no match was hidden.",
       "Аудитор чи регулятор питає: система справді перевірила всі записи? Ми підтверджуємо, що жоден збіг не було приховано.")],
    [t("“Someone edited the log after the fact”", "«Хтось виправив журнал заднім числом»"),
     t("Reports and logs can be changed unnoticed. A recorded file cannot: any edit is immediately visible.",
       "Звіти й журнали можна змінити непомітно. Зафіксований файл непомітно змінити неможливо: будь-яка правка одразу видна.")],
  ]

  const steps = [
    ["1", t("You send the file's “fingerprint”", "Ви надсилаєте «відбиток» файлу"),
     t("The document itself is never sent anywhere. A short code is calculated from it on your computer, and only that code reaches us.",
       "Сам документ нікуди не передається. З нього на вашому комп'ютері рахується короткий код, і лише він іде до нас.")],
    ["2", t("We write it to a public registry", "Ми записуємо його в публічний реєстр"),
     t("The code goes into an independent registry where it can no longer be changed or deleted. Not even by us.",
       "Код потрапляє в незалежний реєстр, де його вже не можна змінити чи видалити. Навіть нам.")],
    ["3", t("You get a receipt", "Ви отримуєте квитанцію"),
     t("You can check it at any time without us. If the file was changed by even one character, the check will show it.",
       "Її можна перевірити будь-коли без нашої участі. Якщо файл змінили хоч на один символ, перевірка це покаже.")],
  ]

  const audience = [
    [IconBuildingBank, t("Banks and fintech", "Банки й фінтех"), t("Screening clients against sanctions lists", "Перевірка клієнтів за санкційними списками"),
     t("Show the regulator that no match was missed and the check used the current list.", "Покажіть регулятору, що жоден збіг не пропущено і перевірка йшла за актуальним списком.")],
    [IconScale, t("Law firms", "Юридичні фірми"), t("Searching case law and case files", "Пошук по судовій практиці й матеріалах справи"),
     t("Prove to a client or a court that nothing important was hidden or filtered out.", "Доведіть клієнту чи суду, що нічого важливого не втаїли і не відфільтрували.")],
    [IconStethoscope, t("Healthcare and pharma", "Медицина і фарма"), t("Clinical guidelines and protocols", "Клінічні настанови й протоколи"),
     t("A recommendation relied on the current edition, not an outdated one.", "Рекомендація спиралась на чинну редакцію, а не на застарілу.")],
    [IconUsers, t("Procurement and HR", "Закупівлі та HR"), t("Selecting bids and candidates", "Відбір пропозицій і кандидатів"),
     t("Nobody was removed from the results by hand, so a disputed decision can be checked.", "Нікого не прибрали з видачі вручну, тож спірне рішення можна перевірити.")],
    [IconPalette, t("Authors and designers", "Автори й дизайнери"), t("Protecting authorship", "Захист авторства"),
     t("Confirm that your work already existed on a given date.", "Підтвердіть, що ваша робота вже існувала на певну дату.")],
    [IconRobot, t("AI companies", "Компанії з AI"), t("A log for compliance", "Журнал для відповідності вимогам"),
     t("Confirm that records of the AI's work were not edited after the event.", "Підтвердіть, що записи про роботу AI не редагували після події.")],
  ] as const

  const faq = [
    [t("Will anyone see my documents?", "Хтось побачить мої документи?"),
     t("No. The document never leaves your computer. Only a short code is sent to us, and the file cannot be reconstructed from it.",
       "Ні. Документ не залишає ваш комп'ютер. До нас іде лише короткий код, з якого відновити файл неможливо.")],
    [t("Does the receipt have legal force?", "Чи має квитанція юридичну силу?"),
     t("It is a solid technical proof that the file existed in this form on a given date. Whether a particular court or regulator accepts it depends on the country and the case. Ask a lawyer before relying on it.",
       "Це надійний технічний доказ того, що файл існував у такому вигляді в певну дату. Чи прийме його конкретний суд чи регулятор, залежить від країни та справи. Уточніть це в юриста, перш ніж покладатися на нього.")],
    [t("What if your company disappears?", "Що буде, якщо ваша компанія зникне?"),
     t("Receipts will keep verifying: the check is open to everyone, and the records live in a public registry that does not depend on us.",
       "Квитанції продовжать перевірятися: перевірка відкрита для всіх, а записи лежать у публічному реєстрі, який від нас не залежить.")],
    [t("Do I need a programmer?", "Чи потрібен програміст?"),
     t("Not to record a single document: just drag the file into your account. For automation there is an API, described on the “For developers” page.",
       "Для разової фіксації ні: достатньо перетягнути файл у кабінеті. Для автоматизації є API, його описано на сторінці «Для розробників».")],
    [t("How much does it cost?", "Скільки це коштує?"),
     t("There is a free plan with no card. Paid plans for larger volumes and for verified search are listed below.",
       "Є безкоштовний тариф без картки. Платні тарифи для більших обсягів і для перевіреного пошуку наведено нижче.")],
  ]

  return (
    <AccountShell>
      <SimpleGrid cols={2} spacing={48} breakpoints={[{ maxWidth: "md", cols: 1 }]} sx={{ alignItems: "center" }} py="xl">
        <Stack spacing="lg">
          <Text fz="xs" tt="uppercase" c="dimmed" fw={600} sx={{ letterSpacing: "0.08em" }}>{t("For business, lawyers and auditors", "Для бізнесу, юристів і аудиторів")}</Text>
          <Title order={1} sx={{ fontSize: "clamp(2rem, 4.4vw, 3rem)", lineHeight: 1.15 }}>
            {t("Prove that a document was not tampered with and a search hid nothing", "Доведіть, що документ не підмінили, а пошук нічого не приховав")}
          </Title>
          <Text fz="lg" c="dimmed">
            {t("AnchorProof issues a receipt that anyone can check: a client, an auditor or a court. Without our involvement and without trusting your IT department.",
               "AnchorProof видає квитанцію, яку може перевірити будь-хто: клієнт, аудитор чи суд. Без нашої участі і без довіри до вашої ІТ-служби.")}
          </Text>
          <Group spacing="sm">
            <Button size="md" onClick={start}>{t("Try it free", "Спробувати безкоштовно")}</Button>
            <Button size="md" variant="default" component="a" href="#how">{t("How it works", "Як це працює")}</Button>
            <Button size="md" variant="subtle" color="gray" onClick={() => navigate("/verify")}>{t("Verify a document", "Перевірити документ")}</Button>
          </Group>
          <Text fz="sm" c="dimmed">{t("100 documents a month free, no bank card.", "100 документів на місяць безкоштовно, без банківської картки.")}</Text>
        </Stack>
        <Group position="center"><SampleCertificate /></Group>
      </SimpleGrid>

      <Section id="problems" eyebrow={t("Familiar situations", "Знайомі ситуації")} title={t("Why you need this", "Навіщо це потрібно")}>
        <SimpleGrid cols={3} breakpoints={[{ maxWidth: "md", cols: 1 }]}>
          {situations.map(([title, text]) => (
            <Card key={title} withBorder padding="lg">
              <Stack spacing={8}>
                <Title order={4}>{title}</Title>
                <Text fz="sm" c="dimmed">{text}</Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Section>

      <Section id="services" eyebrow={t("Services", "Послуги")} title={t("Two services: for documents and for search", "Два сервіси: для документів і для пошуку")}>
        <SimpleGrid cols={2} breakpoints={[{ maxWidth: "md", cols: 1 }]}>
          <Card withBorder padding="lg" sx={{ borderTop: "3px solid #1c7ed6" }}>
            <Stack spacing="sm">
              <Group spacing="sm">
                <ThemeIcon size="lg" variant="light" color="blue"><IconFileCheck size="1.2rem" /></ThemeIcon>
                <Badge variant="light">{t("Available now", "Доступно зараз")}</Badge>
              </Group>
              <Title order={3}>{t("A timestamp for documents", "Печатка часу для документів")}</Title>
              <Text c="dimmed">{t("Record contracts, acts, reports, drawings or creative work and get a receipt.", "Фіксуйте договори, акти, звіти, креслення чи авторські роботи й отримуйте квитанцію.")}</Text>
              <List size="sm" spacing={4} icon={<IconCheck size="0.9rem" />}>
                <List.Item>{t("Proves the file existed in this form no later than a given date", "Доводить, що файл існував у такому вигляді не пізніше певної дати")}</List.Item>
                <List.Item>{t("Shows if anyone changed the file", "Показує, якщо файл хтось змінив")}</List.Item>
                <List.Item>{t("Works from your account or automatically through the API", "Працює з кабінету або автоматично через API")}</List.Item>
              </List>
              <Button variant="light" onClick={start}>{t("Record a document", "Зафіксувати документ")}</Button>
            </Stack>
          </Card>
          <Card withBorder padding="lg" sx={{ borderTop: "3px solid #d9480f" }}>
            <Stack spacing="sm">
              <Group spacing="sm">
                <ThemeIcon size="lg" variant="light" color="orange"><IconSearch size="1.2rem" /></ThemeIcon>
                <Badge variant="light" color="orange">{t("On request", "Під замовлення")}</Badge>
              </Group>
              <Title order={3}>{t("Search with proof of completeness", "Пошук із підтвердженою повнотою")}</Title>
              <Text c="dimmed">{t("For systems that search your data: clients, lists, case law, guidelines.", "Для систем, що шукають по вашій базі: клієнтів, списків, судової практики, настанов.")}</Text>
              <List size="sm" spacing={4} icon={<IconCheck size="0.9rem" />}>
                <List.Item>{t("Every answer comes with a “nothing was missed” confirmation", "До кожної відповіді додається підтвердження «нічого не пропущено»")}</List.Item>
                <List.Item>{t("Shows the data was current, not an old version", "Показує, що база була актуальною, а не старою версією")}</List.Item>
                <List.Item>{t("An outside auditor can verify the confirmation", "Перевірити підтвердження може сторонній аудитор")}</List.Item>
              </List>
              <Button variant="light" color="orange" onClick={() => navigate("/technology")}>{t("See the demo", "Подивитись демо")}</Button>
            </Stack>
          </Card>
        </SimpleGrid>
      </Section>

      <Section id="how" eyebrow={t("How it works", "Як це працює")} title={t("Three steps", "Три кроки")}
        lede={t("You will not see the cryptography: all you need is a file and a few seconds.", "Технічну криптографію ви не побачите: все, що потрібно, це файл і кілька секунд.")}>
        <SimpleGrid cols={3} breakpoints={[{ maxWidth: "md", cols: 1 }]}>
          {steps.map(([n, title, text]) => (
            <Stack key={n} spacing={8}>
              <ThemeIcon size={36} radius="xl" variant="filled" color="orange"><Text fw={700}>{n}</Text></ThemeIcon>
              <Title order={4}>{title}</Title>
              <Text fz="sm" c="dimmed">{text}</Text>
            </Stack>
          ))}
        </SimpleGrid>
      </Section>

      <Section id="audience" eyebrow={t("Who it is for", "Для кого")} title={t("Where a mistake or a swap is costly", "Там, де помилка або підміна коштує дорого")}>
        <SimpleGrid cols={3} breakpoints={[{ maxWidth: "md", cols: 2 }, { maxWidth: "xs", cols: 1 }]}>
          {audience.map(([Icon, who, title, text]) => (
            <Card key={who} withBorder padding="lg">
              <Stack spacing={8}>
                <Group spacing="xs">
                  <ThemeIcon variant="light" color="gray"><Icon size="1.1rem" /></ThemeIcon>
                  <Text fz="xs" tt="uppercase" c="dimmed" fw={600}>{who}</Text>
                </Group>
                <Title order={5}>{title}</Title>
                <Text fz="sm" c="dimmed">{text}</Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Section>

      <Section id="pricing" eyebrow={t("Pricing", "Тарифи")} title={t("Transparent pricing", "Прозорі тарифи")}
        lede={t("You pay by the number of documents. No hidden fees.", "Платите за кількість документів. Ніяких прихованих комісій.")}>
        <SimpleGrid cols={4} breakpoints={[{ maxWidth: "md", cols: 2 }, { maxWidth: "xs", cols: 1 }]}>
          {(plans ?? []).map((p) => (
            <Card key={p.id} withBorder padding="lg" sx={(th) => ({ display: "flex", flexDirection: "column", gap: th.spacing.xs, borderColor: p.id === "search" ? th.colors.orange[6] : undefined })}>
              <Group position="apart"><Text fw={600}>{p.name}</Text>{p.id === "search" && <Badge>{t("for search", "для пошуку")}</Badge>}</Group>
              <Text fz={26} fw={600}>${p.priceUsd}<Text span fz="sm" c="dimmed" fw={400}> {t("/ mo", "/ міс")}</Text></Text>
              <Text fz="sm" c="dimmed">{planLimit(p.anchorsPerMonth, locale)}</Text>
              <List spacing={3} size="sm" icon={<IconCheck size="0.9rem" />} sx={{ flex: 1 }}>
                {planFeatures(p.id).map((f) => <List.Item key={f}>{f}</List.Item>)}
              </List>
              <Button variant={p.id === "search" ? "filled" : "light"} onClick={() => navigate("/pricing")}>
                {p.priceUsd === 0 ? t("Start free", "Почати безкоштовно") : t("Choose", "Обрати")}
              </Button>
            </Card>
          ))}
        </SimpleGrid>
        {plans?.length === 0 && <Text c="dimmed">{t("Pricing is temporarily unavailable.", "Тарифи тимчасово недоступні.")}</Text>}
      </Section>

      <Section id="faq" eyebrow={t("Questions", "Питання")} title={t("Frequently asked questions", "Часті питання")}>
        <Accordion variant="separated">
          {faq.map(([q, a]) => (
            <Accordion.Item key={q} value={q}>
              <Accordion.Control>{q}</Accordion.Control>
              <Accordion.Panel><Text c="dimmed">{a}</Text></Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Section>

      <Card withBorder padding="xl" mt={64} sx={{ textAlign: "center" }}>
        <Stack spacing="md" align="center">
          <Title order={3}>{t("Start with one document", "Почніть з одного документа")}</Title>
          <Text c="dimmed" maw={520}>{t("Sign up, drag in a file and get a receipt in a few seconds. No bank card needed.", "Зареєструйтесь, перетягніть файл і за кілька секунд отримайте квитанцію. Банківська картка не потрібна.")}</Text>
          <Button size="md" onClick={start}>{t("Try it free", "Спробувати безкоштовно")}</Button>
        </Stack>
      </Card>

      <Text fz="xs" c="dimmed" mt={48} pt="md" sx={(th) => ({ borderTop: `1px solid ${th.colorScheme === "dark" ? th.colors.dark[4] : th.colors.gray[3]}` })}>
        {t("AnchorProof is a learning prototype. In this version the public registry is simulated; before real use it is connected to a real network. Prices are indicative.",
           "AnchorProof — навчальний прототип. У цій версії публічний реєстр імітується; перед реальним використанням його підключають до справжньої мережі. Ціни орієнтовні.")}
      </Text>
    </AccountShell>
  )
}
