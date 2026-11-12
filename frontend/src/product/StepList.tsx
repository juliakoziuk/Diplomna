import { Badge, Paper, Text } from "@mantine/core"
import type { StepStatus } from "./sim"
import { tr } from "../i18n"

export interface StepItem { label: string; status: StepStatus; detail: string }

const statusOf = (): Record<StepStatus, { color: string; text: string }> => ({
  ok: { color: "green", text: tr("✓ passed", "✓ пройдено") },
  fail: { color: "red", text: tr("✗ failed", "✗ провалено") },
  skip: { color: "gray", text: tr("— not checked", "— не перевіряється") },
  trust: { color: "yellow", text: tr("✓ on the server's word", "✓ на слово сервера") },
})

export default function StepList({ steps }: { steps: StepItem[] }) {
  return (
    <Paper withBorder radius="md">
      {steps.map((s, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "1.5rem minmax(0, 1fr) auto",
            columnGap: 12,
            rowGap: 2,
            alignItems: "start",
            padding: "8px 16px",
            borderTop: i ? "1px solid var(--ap-border)" : undefined,
          }}
        >
          <Text fz="xs" c="dimmed" ff="monospace" pt={2}>{i + 1}</Text>
          <Text fz="sm">{s.label}</Text>
          <Badge color={statusOf()[s.status].color} variant="light" sx={{ flexShrink: 0 }}>{statusOf()[s.status].text}</Badge>
          <Text fz="xs" c="dimmed" ff="monospace" sx={{ gridColumn: "2 / 4", wordBreak: "break-word" }}>{s.detail}</Text>
        </div>
      ))}
    </Paper>
  )
}
