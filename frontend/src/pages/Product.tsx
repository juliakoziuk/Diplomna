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
import "../product/product.css"

/**
 * Marketing landing for non-technical buyers: what the service does, who needs
 * it and what it costs, in plain words. No cryptography terms here; the
 * technical side lives on /technology.
 */

const SITUATIONS = [
  ["«Ми підписали іншу версію договору»", "Через рік сторони сперечаються, який саме текст було підписано. Квитанція показує, що цей файл існував у цей день і відтоді не змінювався."],
  ["«Покажіть, що пошук був повним»", "Аудитор чи регулятор питає: система справді перевірила всі записи? Ми підтверджуємо, що жоден збіг не було приховано."],
  ["«Хтось виправив журнал заднім числом»", "Звіти й журнали можна змінити непомітно. Зафіксований файл непомітно змінити неможливо: будь-яка правка одразу видна."],
]

const STEPS = [
  ["1", "Ви надсилаєте «відбиток» файлу", "Сам документ нікуди не передається. З нього на вашому комп'ютері рахується короткий код, і лише він іде до нас."],
  ["2", "Ми записуємо його в публічний реєстр", "Код потрапляє в незалежний реєстр, де його вже не можна змінити чи видалити. Навіть нам."],
  ["3", "Ви отримуєте квитанцію", "Її можна перевірити будь-коли без нашої участі. Якщо файл змінили хоч на один символ, перевірка це покаже."],
]

const AUDIENCE = [
  [IconBuildingBank, "Банки й фінтех", "Перевірка клієнтів за санкційними списками", "Покажіть регулятору, що жоден збіг не пропущено і перевірка йшла за актуальним списком."],
  [IconScale, "Юридичні фірми", "Пошук по судовій практиці й матеріалах справи", "Доведіть клієнту чи суду, що нічого важливого не втаїли і не відфільтрували."],
  [IconStethoscope, "Медицина і фарма", "Клінічні настанови й протоколи", "Рекомендація спиралась на чинну редакцію, а не на застарілу."],
  [IconUsers, "Закупівлі та HR", "Відбір пропозицій і кандидатів", "Нікого не прибрали з видачі вручну, тож спірне рішення можна перевірити."],
  [IconPalette, "Автори й дизайнери", "Захист авторства", "Підтвердіть, що ваша робота вже існувала на певну дату."],
  [IconRobot, "Компанії з AI", "Журнал для відповідності вимогам", "Підтвердіть, що записи про роботу AI не редагували після події."],
] as const

const FAQ = [
  ["Хтось побачить мої документи?", "Ні. Документ не залишає ваш комп'ютер. До нас іде лише короткий код, з якого відновити файл неможливо."],
  ["Чи має квитанція юридичну силу?", "Це надійний технічний доказ того, що файл існував у такому вигляді в певну дату. Чи прийме його конкретний суд чи регулятор, залежить від країни та справи. Уточніть це в юриста, перш ніж покладатися на нього."],
  ["Що буде, якщо ваша компанія зникне?", "Квитанції продовжать перевірятися: перевірка відкрита для всіх, а записи лежать у публічному реєстрі, який від нас не залежить."],
  ["Чи потрібен програміст?", "Для разової фіксації ні: достатньо перетягнути файл у кабінеті. Для автоматизації є API, його описано на сторінці «Для розробників»."],
  ["Скільки це коштує?", "Є безкоштовний тариф без картки. Платні тарифи для більших обсягів і для перевіреного пошуку наведено нижче."],
]

function SampleCertificate() {
  const today = new Date().toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })
  const row = (a: string, c: string) => <div className="row" key={a}><span>{a}</span><span>{c}</span></div>
  return (
    <div className="ap-receipt" aria-label="Приклад квитанції">
      <div className="rh">КВИТАНЦІЯ · ПРИКЛАД</div>
      {row("Файл", "договір_постачання.pdf")}
      {row("Зафіксовано", today)}
      <hr />
      {row("Змінювався з того часу?", "Ні")}
      {row("Хто може перевірити", "Будь-хто")}
      {row("Потрібна наша участь", "Ні")}
      <div className="stamp">НЕ ЗМІНЮВАЛИ</div>
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
  const userId = useUserStore((s) => s.id)
  const toggleLogin = useGeneralStore((s) => s.toggleLoginModal)
  const [plans, setPlans] = useState<Plan[] | null>(null)

  useEffect(() => { billingApi.plans().then(setPlans).catch(() => setPlans([])) }, [])

  const start = () => (userId ? navigate("/account") : toggleLogin())

  return (
    <AccountShell>
      <SimpleGrid cols={2} spacing={48} breakpoints={[{ maxWidth: "md", cols: 1 }]} sx={{ alignItems: "center" }} py="xl">
        <Stack spacing="lg">
          <Text fz="xs" tt="uppercase" c="dimmed" fw={600} sx={{ letterSpacing: "0.08em" }}>Для бізнесу, юристів і аудиторів</Text>
          <Title order={1} sx={{ fontSize: "clamp(2rem, 4.4vw, 3rem)", lineHeight: 1.15 }}>
            Доведіть, що документ не підмінили, а пошук нічого не приховав
          </Title>
          <Text fz="lg" c="dimmed">
            AnchorProof видає квитанцію, яку може перевірити будь-хто: клієнт, аудитор чи суд. Без нашої участі
            і без довіри до вашої ІТ-служби.
          </Text>
          <Group spacing="sm">
            <Button size="md" onClick={start}>Спробувати безкоштовно</Button>
            <Button size="md" variant="default" component="a" href="#how">Як це працює</Button>
          </Group>
          <Text fz="sm" c="dimmed">100 документів на місяць безкоштовно, без банківської картки.</Text>
        </Stack>
        <Group position="center"><SampleCertificate /></Group>
      </SimpleGrid>

      <Section id="problems" eyebrow="Знайомі ситуації" title="Навіщо це потрібно">
        <SimpleGrid cols={3} breakpoints={[{ maxWidth: "md", cols: 1 }]}>
          {SITUATIONS.map(([title, text]) => (
            <Card key={title} withBorder padding="lg">
              <Stack spacing={8}>
                <Title order={4}>{title}</Title>
                <Text fz="sm" c="dimmed">{text}</Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Section>

      <Section id="services" eyebrow="Послуги" title="Два сервіси: для документів і для пошуку">
        <SimpleGrid cols={2} breakpoints={[{ maxWidth: "md", cols: 1 }]}>
          <Card withBorder padding="lg" sx={{ borderTop: "3px solid #1c7ed6" }}>
            <Stack spacing="sm">
              <Group spacing="sm">
                <ThemeIcon size="lg" variant="light" color="blue"><IconFileCheck size="1.2rem" /></ThemeIcon>
                <Badge variant="light">Доступно зараз</Badge>
              </Group>
              <Title order={3}>Печатка часу для документів</Title>
              <Text c="dimmed">Фіксуйте договори, акти, звіти, креслення чи авторські роботи й отримуйте квитанцію.</Text>
              <List size="sm" spacing={4} icon={<IconCheck size="0.9rem" />}>
                <List.Item>Доводить, що файл існував у такому вигляді не пізніше певної дати</List.Item>
                <List.Item>Показує, якщо файл хтось змінив</List.Item>
                <List.Item>Працює з кабінету або автоматично через API</List.Item>
              </List>
              <Button variant="light" onClick={start}>Зафіксувати документ</Button>
            </Stack>
          </Card>
          <Card withBorder padding="lg" sx={{ borderTop: "3px solid #d9480f" }}>
            <Stack spacing="sm">
              <Group spacing="sm">
                <ThemeIcon size="lg" variant="light" color="orange"><IconSearch size="1.2rem" /></ThemeIcon>
                <Badge variant="light" color="orange">Під замовлення</Badge>
              </Group>
              <Title order={3}>Пошук із підтвердженою повнотою</Title>
              <Text c="dimmed">Для систем, що шукають по вашій базі: клієнтів, списків, судової практики, настанов.</Text>
              <List size="sm" spacing={4} icon={<IconCheck size="0.9rem" />}>
                <List.Item>До кожної відповіді додається підтвердження «нічого не пропущено»</List.Item>
                <List.Item>Показує, що база була актуальною, а не старою версією</List.Item>
                <List.Item>Перевірити підтвердження може сторонній аудитор</List.Item>
              </List>
              <Button variant="light" color="orange" onClick={() => navigate("/technology")}>Подивитись демо</Button>
            </Stack>
          </Card>
        </SimpleGrid>
      </Section>

      <Section id="how" eyebrow="Як це працює" title="Три кроки"
        lede="Технічну криптографію ви не побачите: все, що потрібно, це файл і кілька секунд.">
        <SimpleGrid cols={3} breakpoints={[{ maxWidth: "md", cols: 1 }]}>
          {STEPS.map(([n, title, text]) => (
            <Stack key={n} spacing={8}>
              <ThemeIcon size={36} radius="xl" variant="filled" color="orange"><Text fw={700}>{n}</Text></ThemeIcon>
              <Title order={4}>{title}</Title>
              <Text fz="sm" c="dimmed">{text}</Text>
            </Stack>
          ))}
        </SimpleGrid>
      </Section>

      <Section id="audience" eyebrow="Для кого" title="Там, де помилка або підміна коштує дорого">
        <SimpleGrid cols={3} breakpoints={[{ maxWidth: "md", cols: 2 }, { maxWidth: "xs", cols: 1 }]}>
          {AUDIENCE.map(([Icon, who, title, text]) => (
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

      <Section id="pricing" eyebrow="Тарифи" title="Прозорі тарифи" lede="Платите за кількість документів. Ніяких прихованих комісій.">
        <SimpleGrid cols={4} breakpoints={[{ maxWidth: "md", cols: 2 }, { maxWidth: "xs", cols: 1 }]}>
          {(plans ?? []).map((p) => (
            <Card key={p.id} withBorder padding="lg" sx={(t) => ({ display: "flex", flexDirection: "column", gap: t.spacing.xs, borderColor: p.id === "search" ? t.colors.orange[6] : undefined })}>
              <Group position="apart"><Text fw={600}>{p.name}</Text>{p.id === "search" && <Badge>для пошуку</Badge>}</Group>
              <Text fz={26} fw={600}>${p.priceUsd}<Text span fz="sm" c="dimmed" fw={400}> / міс</Text></Text>
              <Text fz="sm" c="dimmed">{p.anchorsPerMonth === null ? "Без ліміту документів" : `${p.anchorsPerMonth.toLocaleString("uk-UA")} документів на місяць`}</Text>
              <List spacing={3} size="sm" icon={<IconCheck size="0.9rem" />} sx={{ flex: 1 }}>
                {p.features.map((f) => <List.Item key={f}>{f}</List.Item>)}
              </List>
              <Button variant={p.id === "search" ? "filled" : "light"} onClick={() => navigate("/pricing")}>
                {p.priceUsd === 0 ? "Почати безкоштовно" : "Обрати"}
              </Button>
            </Card>
          ))}
        </SimpleGrid>
        {plans?.length === 0 && <Text c="dimmed">Тарифи тимчасово недоступні.</Text>}
      </Section>

      <Section id="faq" eyebrow="Питання" title="Часті питання">
        <Accordion variant="separated">
          {FAQ.map(([q, a]) => (
            <Accordion.Item key={q} value={q}>
              <Accordion.Control>{q}</Accordion.Control>
              <Accordion.Panel><Text c="dimmed">{a}</Text></Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Section>

      <Card withBorder padding="xl" mt={64} sx={{ textAlign: "center" }}>
        <Stack spacing="md" align="center">
          <Title order={3}>Почніть з одного документа</Title>
          <Text c="dimmed" maw={520}>Зареєструйтесь, перетягніть файл і за кілька секунд отримайте квитанцію. Банківська картка не потрібна.</Text>
          <Button size="md" onClick={start}>Спробувати безкоштовно</Button>
        </Stack>
      </Card>

      <Text fz="xs" c="dimmed" mt={48} pt="md" sx={(t) => ({ borderTop: `1px solid ${t.colorScheme === "dark" ? t.colors.dark[4] : t.colors.gray[3]}` })}>
        AnchorProof — навчальний прототип. У цій версії публічний реєстр імітується; перед реальним використанням
        його підключають до справжньої мережі. Ціни орієнтовні.
      </Text>
    </AccountShell>
  )
}
