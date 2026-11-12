import { useMemo, useRef } from "react"
import { Button, Group, Modal, Stack, Text } from "@mantine/core"
import { IconBraces, IconPrinter } from "@tabler/icons-react"
import { AnchorItem } from "../../api/account"
import { receiptHtml } from "../../receipts/receiptHtml"
import { useI18n } from "../../i18n"

function downloadJson(item: AnchorItem) {
  const blob = new Blob([JSON.stringify(item.receipt, null, 2)], { type: "application/json" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `receipt-${item.id}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Human-readable receipt with a print / "Save as PDF" button and the raw JSON for verification. */
export default function ReceiptModal({ item, onClose }: { item: AnchorItem | null; onClose: () => void }) {
  const { t, lang } = useI18n()
  const frameRef = useRef<HTMLIFrameElement>(null)
  // The sheet is written in the active language, so it must be rebuilt when the language changes.
  const html = useMemo(() => (item?.receipt ? receiptHtml(item, `${window.location.origin}/verify`) : ""), [item, lang])

  const print = () => {
    const win = frameRef.current?.contentWindow
    win?.focus()
    win?.print()
  }

  return (
    <Modal opened={!!item} onClose={onClose} size="lg" radius="lg" centered title={<Text fw={700}>{t("Recording receipt", "Квитанція про фіксацію")}</Text>}
      overlayProps={{ blur: 3, opacity: 0.5 }}>
      {item && (
        <Stack spacing="md">
          <iframe
            ref={frameRef}
            title={t("Receipt", "Квитанція")}
            srcDoc={html}
            style={{ width: "100%", height: 520, border: "1px solid #dee2e6", borderRadius: 8, background: "#fff" }}
          />
          <Group position="apart">
            <Text fz="xs" c="dimmed" maw={320}>{t("In the print window choose “Save as PDF”. Keep the receipt together with the original file.", "У вікні друку оберіть «Зберегти як PDF». Збережіть квитанцію разом з оригіналом файлу.")}</Text>
            <Group spacing="xs">
              <Button variant="default" leftIcon={<IconBraces size="1rem" />} onClick={() => downloadJson(item)}>{t(".json file", "Файл .json")}</Button>
              <Button leftIcon={<IconPrinter size="1rem" />} onClick={print}>{t("Print / PDF", "Друкувати / PDF")}</Button>
            </Group>
          </Group>
        </Stack>
      )}
    </Modal>
  )
}
