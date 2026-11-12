import { useEffect, useState } from "react"
import { Badge, Grid, Paper, ScrollArea, Stack, Table, Text, Title } from "@mantine/core"
import { ATTACKS, METHODS, Method, bench } from "./sim"
import { tr, useI18n } from "../i18n"

const methodRows = () => [
  { name: tr("Inclusion only", "Лише включення"), idea: tr("A Merkle proof for each of the k results.", "Доказ Меркла для кожного з k результатів."), plus: tr("The smallest proof", "Найменший доказ"), minus: tr("Cannot see hiding, cluster swaps or rollback", "Не бачить приховування, підміни кластерів і rollback"), badge: ["red", tr("not enough", "недостатньо")] },
  { name: tr("A. Full disclosure", "A. Повне розкриття"), idea: tr("The server returns every vector of the probed clusters and the client recomputes everything itself.", "Сервер віддає всі вектори перевірених кластерів, клієнт перераховує все сам."), plus: tr("Simple and transparent", "Просто і прозоро"), minus: tr("The proof grows with the cluster size", "Доказ росте з розміром кластера"), badge: ["gray", tr("baseline", "базова лінія")] },
  { name: tr("B. Ring range", "B. Кільцевий діапазон"), idea: tr("A cluster is sorted by distance to its centroid; by the triangle inequality the candidates lie in a contiguous ring, and only that ring plus two boundaries is revealed.", "Кластер відсортовано за відстанню до центроїда; за нерівністю трикутника кандидати лежать у суцільному кільці, розкривається лише воно плюс дві межі."), plus: tr("A smaller proof, O(log n) hashes", "Менший доказ, O(log n) хешів"), minus: tr("In high dimensions the ring gets wider", "У високих вимірах кільце ширшає"), badge: ["orange", tr("in the product", "у продукті")], rec: true },
  { name: "C. Merkle ball-tree", idea: tr("Each node commits to a ball; the client prunes subtrees that are guaranteed to be farther than r_k.", "Кожен вузол комітить кулю; клієнт відсікає піддерева, гарантовано далі за r_k."), plus: tr("Few leaves for large clusters", "Мало листків для великих кластерів"), minus: tr("Every pruned ball reveals its center", "Кожна відсічена куля розкриває свій центр"), badge: ["yellow", tr("experimental", "експеримент")] },
  { name: tr("D. zk proof of search", "D. zk-доказ пошуку"), idea: tr("A SNARK proves the whole top-k computation was correct.", "SNARK доводить правильність усього обчислення top-k."), plus: tr("≈ 0.3 KB after a Groth16 wrapper (estimate)", "≈ 0,3 КБ після Groth16-обгортки (оцінка)"), minus: tr("Generation takes minutes per query (estimate)", "Генерація — хвилини на запит (оцінка)"), badge: ["gray", tr("research", "дослідження")] },
]
const labelOf = (): Record<Method, string> => ({ V0: tr("Inclusion", "Включення"), A: "A", B: "B", C: "C" })
const attackName = (): Record<string, string> => ({ hide: tr("Hide the best", "Приховати найкращий"), centroid: tr("Swap clusters", "Підмінити кластери"), tamper: tr("Forge a vector", "Підробити вектор"), rollback: "Rollback" })
const BAR_COLOR: Record<Method, string> = { V0: "var(--ap-bar-muted)", A: "var(--ap-accent)", B: "var(--ap-accent)", C: "var(--ap-bar-chain)" }

export default function MethodsSection({ k, nprobe }: { k: number; nprobe: number }) {
  const { t } = useI18n()
  const [data, setData] = useState<ReturnType<typeof bench> | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setData(bench(k, nprobe)), 150)
    return () => clearTimeout(timer)
  }, [k, nprobe])

  const max = data ? Math.max(...METHODS.map((m) => data.avgKb[m])) : 1

  return (
    <Stack spacing="lg">
      <Paper withBorder radius="md">
        <ScrollArea>
          <Table verticalSpacing="sm" miw={760}>
            <thead><tr><th>{t("Method", "Метод")}</th><th>{t("Idea", "Ідея")}</th><th>{t("Strength", "Сильна сторона")}</th><th>{t("Limitation", "Обмеження")}</th><th>{t("Status", "Статус")}</th></tr></thead>
            <tbody>
              {methodRows().map((r) => (
                <tr key={r.name} style={r.rec ? { background: "var(--ap-rec-row)" } : undefined}>
                  <td><Text fz="sm" fw={600}>{r.name}</Text></td>
                  <td><Text fz="sm">{r.idea}</Text></td>
                  <td><Text fz="sm">{r.plus}</Text></td>
                  <td><Text fz="sm">{r.minus}</Text></td>
                  <td><Badge color={r.badge[0]}>{r.badge[1]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </ScrollArea>
      </Paper>

      <Grid gutter="lg">
        <Grid.Col md={6}>
          <Paper withBorder p="md" radius="md">
            <Title order={4} mb="sm">{t("Average proof size, KB", "Середній розмір доказу, КБ")}</Title>
            {!data ? <Text c="dimmed">{t("Calculating…", "Рахуємо…")}</Text> : (
              <Stack spacing={8}>
                {METHODS.map((m) => {
                  const pct = (data.avgKb[m] / max) * 100, inside = pct > 55
                  return (
                    <Grid key={m} gutter="xs" align="center">
                      <Grid.Col span={3}><Text fz="sm">{m === "V0" ? t("Inclusion only", "Лише включення") : `${m}`}</Text></Grid.Col>
                      <Grid.Col span={9}>
                        <div className="ap-bar-track">
                          <div className="ap-bar-fill" style={{ width: `${pct}%`, background: BAR_COLOR[m] }} />
                          <span className="ap-bar-val" style={inside ? { right: `${100 - pct}%`, paddingRight: 8, color: "#fff" } : { left: `${pct}%`, paddingLeft: 8 }}>
                            {data.avgKb[m].toFixed(1)} {t("KB", "КБ")}
                          </span>
                        </div>
                      </Grid.Col>
                    </Grid>
                  )
                })}
                <Text fz="xs" c="dimmed">
                  {t(`k = ${k}, nprobe = ${nprobe}: method B is ${Math.round((1 - data.avgKb.B / data.avgKb.A) * 100)}% smaller than A. D is about 0.3 KB, but takes minutes to generate (an estimate, not a measurement).`,
                     `k = ${k}, nprobe = ${nprobe}: метод B на ${Math.round((1 - data.avgKb.B / data.avgKb.A) * 100)} % менший за A. D — близько 0,3 КБ, але хвилини на генерацію (оцінка, не вимір).`)}
                </Text>
              </Stack>
            )}
          </Paper>
        </Grid.Col>
        <Grid.Col md={6}>
          <Paper withBorder p="md" radius="md">
            <Title order={4} mb="sm">{t("Share of attacks detected", "Частка виявлених атак")}</Title>
            {!data ? <Text c="dimmed">{t("Calculating…", "Рахуємо…")}</Text> : (
              <Table verticalSpacing={6}>
                <thead><tr><th>{t("Attack", "Атака")}</th>{METHODS.map((m) => <th key={m}>{labelOf()[m]}</th>)}</tr></thead>
                <tbody>
                  {ATTACKS.map((a) => (
                    <tr key={a}>
                      <td><Text fz="sm">{attackName()[a]}</Text></td>
                      {METHODS.map((m) => {
                        const x = data.detection[m][a]
                        return <td key={m}>{x === null ? <Badge color="gray">{t("n/a", "н/д")}</Badge> : <Badge color={x === 1 ? "green" : x === 0 ? "red" : "yellow"}>{Math.round(x * 100)} %</Badge>}</td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <Text fz="xs" c="dimmed" mt="xs">{t("80 random queries with the demo parameters. In 2D methods B and C look better than they will at 384 dimensions.", "80 випадкових запитів з параметрами демо. У 2D методи B і C виглядають вигідніше, ніж будуть при 384 вимірах.")}</Text>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  )
}
