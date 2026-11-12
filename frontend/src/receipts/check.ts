import { hashLeaf, verifyInclusionProof } from "verification-sdk"
import { DocumentReceipt, accountApi } from "../api/account"

/** SHA-256 of a file, computed in the browser: the file itself never leaves the device. */
export async function sha256Hex(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

export const formatLong = (d: Date) => d.toLocaleString("uk-UA", { dateStyle: "long", timeStyle: "short" })

/** Accepts the receipt JSON itself, or an anchor record that contains it under `receipt`. */
export function parseReceipt(raw: string): DocumentReceipt {
  let o: any
  try {
    o = JSON.parse(raw)
  } catch {
    throw new Error("Це не схоже на квитанцію: текст пошкоджений або скопійований не повністю.")
  }
  const r = o?.type === "document-receipt" ? o : o?.receipt
  const valid =
    r?.type === "document-receipt" &&
    typeof r.sha256 === "string" && /^[0-9a-f]{64}$/i.test(r.sha256) &&
    typeof r.leaf === "string" && typeof r.batchRoot === "string" &&
    Array.isArray(r.siblings) && typeof r.epoch === "number"
  if (!valid) throw new Error("Це не квитанція AnchorProof про фіксацію документа.")
  return r as DocumentReceipt
}

export type CheckStatus = "ok" | "fail" | "skip"
export interface CheckLine { status: CheckStatus; title: string; detail?: string }
export interface Verdict {
  state: "ok" | "partial" | "fail"
  headline: string
  lines: CheckLine[]
  anchoredAt?: Date
  epoch: number
  txHash?: string
  /** True when the receipt comes from the demo registry, not a public blockchain. */
  demoRegistry: boolean
}

/**
 * Independent check of a document receipt: the file hash (when a file is given),
 * the Merkle proof, and the batch root read back from the public registry.
 */
export async function checkReceipt(r: DocumentReceipt, fileHash: string | null): Promise<Verdict> {
  const lines: CheckLine[] = []

  if (fileHash === null) {
    lines.push({ status: "skip", title: "Файл не перевіряли", detail: "Додайте файл, щоб переконатися, що він не змінений." })
  } else if (fileHash.toLowerCase() === r.sha256.toLowerCase()) {
    lines.push({ status: "ok", title: "Файл збігається з квитанцією", detail: "Цифровий відбиток файлу такий самий, як у квитанції." })
  } else {
    lines.push({ status: "fail", title: "Файл не збігається з квитанцією", detail: "Файл змінили після фіксації, або це інший файл." })
  }
  const fileFailed = lines[0].status === "fail"

  const proofOk =
    hashLeaf(r.sha256).toLowerCase() === String(r.leaf).toLowerCase() && verifyInclusionProof(r.leaf, r.siblings, r.batchRoot)
  lines.push(
    proofOk
      ? { status: "ok", title: "Запис про документ у квитанції внутрішньо правильний", detail: "Документ справді входить до партії, зазначеної в квитанції." }
      : { status: "fail", title: "Квитанція пошкоджена або підроблена", detail: "Запис про документ не сходиться з партією." },
  )

  let anchoredAt: Date | undefined
  let txHash: string | undefined
  try {
    const anchor = await accountApi.chainRoot(r.epoch)
    txHash = anchor.txHash
    if (anchor.root.toLowerCase() === r.batchRoot.toLowerCase()) {
      // The demo registry reports milliseconds, an on-chain one (block.timestamp) seconds.
      anchoredAt = new Date(anchor.timestamp < 1e12 ? anchor.timestamp * 1000 : anchor.timestamp)
      lines.push({ status: "ok", title: "Партію зафіксовано в публічному реєстрі", detail: `Дата фіксації: ${formatLong(anchoredAt)}.` })
    } else {
      lines.push({ status: "fail", title: "Реєстр містить інший запис", detail: "Квитанцію підроблено або видано для іншого реєстру." })
    }
  } catch {
    lines.push({
      status: "fail",
      title: "Не вдалося знайти партію в реєстрі",
      detail: "Реєстр недоступний, або запис видалено. У демонстраційній версії реєстр очищається при перезапуску сервера.",
    })
  }

  const failed = lines.some((l) => l.status === "fail")
  const state: Verdict["state"] = failed ? "fail" : fileHash === null ? "partial" : "ok"
  const headline =
    state === "ok"
      ? `Документ не змінювали з ${formatLong(anchoredAt!)}`
      : state === "partial"
        ? "Квитанція справжня. Файл ще не перевірено"
        : fileFailed
          ? "Файл не відповідає квитанції"
          : "Квитанція не пройшла перевірку"

  return { state, headline, lines, anchoredAt, epoch: r.epoch, txHash, demoRegistry: r.network === "mock" }
}
