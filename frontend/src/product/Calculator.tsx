import { useState } from "react"
import { Badge, Grid, NumberInput, Paper, ScrollArea, Stack, Table, Text } from "@mantine/core"
import { useI18n } from "../i18n"

/** Gas per anchor, estimated from MerkleAnchor.sol (root+timestamp write, version counter, event). */
const GAS_ROOT = 70_000
const GAS_MMR = 90_000

export default function Calculator() {
  const { t, locale } = useI18n()
  const [updates, setUpdates] = useState<number | "">(2000)
  const [epochMin, setEpochMin] = useState<number | "">(10)
  const [gwei, setGwei] = useState<number | "">(30)
  const [pol, setPol] = useState<number | "">(0.25)

  const upd = Math.max(1, Number(updates) || 1)
  const ep = Math.max(1, Number(epochMin) || 1)
  const perDayEpoch = Math.min(upd, 1440 / ep)
  const modes = [
    { name: t("E1 · a transaction per update", "E1 · транзакція на кожне оновлення"), tx: upd, gas: GAS_ROOT, fresh: t("one block, ≈ 2 s", "один блок, ≈ 2 с"), del: false },
    { name: t("E2 · epochs", "E2 · епохи"), tx: perDayEpoch, gas: GAS_ROOT, fresh: t(`up to ${ep} min`, `до ${ep} хв`), del: false, rec: true },
    { name: t("E3 · epochs + MMR", "E3 · епохи + MMR"), tx: perDayEpoch, gas: GAS_MMR, fresh: t(`up to ${ep} min`, `до ${ep} хв`), del: true },
  ]
  const usd = (x: number) => (x >= 100 ? `$${Math.round(x).toLocaleString(locale)}` : x >= 1 ? `$${x.toFixed(2)}` : `$${x.toFixed(3)}`)

  return (
    <Grid gutter="lg">
      <Grid.Col md={4}>
        <Paper withBorder p="md" radius="md">
          <Stack spacing="sm">
            <NumberInput label={t("Index updates per day", "Оновлень індексу на день")} min={1} value={updates} onChange={setUpdates} />
            <NumberInput label={t("Epoch length, min", "Тривалість епохи, хв")} min={1} value={epochMin} onChange={setEpochMin} />
            <NumberInput label={t("Gas price, gwei", "Ціна газу, gwei")} min={0} value={gwei} onChange={setGwei} />
            <NumberInput label={t("POL rate, $", "Курс POL, $")} min={0} step={0.01} precision={2} value={pol} onChange={setPol} />
            <Text fz="xs" c="dimmed">
              {t("About 70k gas per anchor, about 90k for MMR. An estimate from the contract, to be refined on the Amoy testnet.", "Близько 70 тис. газу на анкор, для MMR близько 90 тис. Оцінка з контракту, уточнюється на тестнеті Amoy.")}
            </Text>
          </Stack>
        </Paper>
      </Grid.Col>
      <Grid.Col md={8}>
        <Paper withBorder radius="md">
          <ScrollArea>
            <Table verticalSpacing="sm" miw={640}>
              <thead>
                <tr><th>{t("Mode", "Режим")}</th><th>{t("Transactions / mo", "Транзакцій / міс")}</th><th>{t("Cost / mo", "Вартість / міс")}</th><th>{t("Per update", "На оновлення")}</th><th>{t("Freshness", "Свіжість")}</th><th>{t("Silent deletion", "Тихе видалення")}</th></tr>
              </thead>
              <tbody>
                {modes.map((m) => {
                  const txm = m.tx * 30
                  const cost = txm * m.gas * (Number(gwei) || 0) * 1e-9 * (Number(pol) || 0)
                  return (
                    <tr key={m.name} style={m.rec ? { background: "var(--ap-rec-row)" } : undefined}>
                      <td><Text fz="sm" fw={600}>{m.name}</Text></td>
                      <td><Text fz="sm" ff="monospace">{Math.round(txm).toLocaleString(locale)}</Text></td>
                      <td><Text fz="sm" ff="monospace">{usd(cost)}</Text></td>
                      <td><Text fz="sm" ff="monospace">{usd(cost / (upd * 30))}</Text></td>
                      <td><Text fz="sm">{m.fresh}</Text></td>
                      <td>{m.del ? <Badge color="green">{t("detected", "виявляється")}</Badge> : <Badge color="red">{t("not detected", "не виявляється")}</Badge>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </ScrollArea>
        </Paper>
      </Grid.Col>
    </Grid>
  )
}
