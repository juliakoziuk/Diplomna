import { hashLeaf, verifyInclusionProof } from "verification-sdk"
import { DocumentReceipt, accountApi } from "../api/account"
import { localeOf, tr } from "../i18n"

/** SHA-256 of a file, computed in the browser: the file itself never leaves the device. */
export async function sha256Hex(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

export const formatLong = (d: Date) => d.toLocaleString(localeOf(), { dateStyle: "long", timeStyle: "short" })

/** Accepts the receipt JSON itself, or an anchor record that contains it under `receipt`. */
export function parseReceipt(raw: string): DocumentReceipt {
  let o: any
  try {
    o = JSON.parse(raw)
  } catch {
    throw new Error(tr("This does not look like a receipt: the text is damaged or was copied incompletely.", "Це не схоже на квитанцію: текст пошкоджений або скопійований не повністю."))
  }
  const r = o?.type === "document-receipt" ? o : o?.receipt
  const valid =
    r?.type === "document-receipt" &&
    typeof r.sha256 === "string" && /^[0-9a-f]{64}$/i.test(r.sha256) &&
    typeof r.leaf === "string" && typeof r.batchRoot === "string" &&
    Array.isArray(r.siblings) && typeof r.epoch === "number"
  if (!valid) throw new Error(tr("This is not an AnchorProof document receipt.", "Це не квитанція AnchorProof про фіксацію документа."))
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
    lines.push({ status: "skip", title: tr("File not checked", "Файл не перевіряли"), detail: tr("Add the file to make sure it has not been changed.", "Додайте файл, щоб переконатися, що він не змінений.") })
  } else if (fileHash.toLowerCase() === r.sha256.toLowerCase()) {
    lines.push({ status: "ok", title: tr("The file matches the receipt", "Файл збігається з квитанцією"), detail: tr("The file's fingerprint is the same as in the receipt.", "Цифровий відбиток файлу такий самий, як у квитанції.") })
  } else {
    lines.push({ status: "fail", title: tr("The file does not match the receipt", "Файл не збігається з квитанцією"), detail: tr("The file was changed after it was recorded, or this is a different file.", "Файл змінили після фіксації, або це інший файл.") })
  }
  const fileFailed = lines[0].status === "fail"

  const proofOk =
    hashLeaf(r.sha256).toLowerCase() === String(r.leaf).toLowerCase() && verifyInclusionProof(r.leaf, r.siblings, r.batchRoot)
  lines.push(
    proofOk
      ? { status: "ok", title: tr("The document record in the receipt is internally consistent", "Запис про документ у квитанції внутрішньо правильний"), detail: tr("The document really belongs to the batch named in the receipt.", "Документ справді входить до партії, зазначеної в квитанції.") }
      : { status: "fail", title: tr("The receipt is damaged or forged", "Квитанція пошкоджена або підроблена"), detail: tr("The document record does not agree with the batch.", "Запис про документ не сходиться з партією.") },
  )

  let anchoredAt: Date | undefined
  let txHash: string | undefined
  try {
    const anchor = await accountApi.chainRoot(r.epoch)
    txHash = anchor.txHash
    if (anchor.root.toLowerCase() === r.batchRoot.toLowerCase()) {
      // The demo registry reports milliseconds, an on-chain one (block.timestamp) seconds.
      anchoredAt = new Date(anchor.timestamp < 1e12 ? anchor.timestamp * 1000 : anchor.timestamp)
      lines.push({ status: "ok", title: tr("The batch is recorded in the public registry", "Партію зафіксовано в публічному реєстрі"), detail: tr(`Recorded on: ${formatLong(anchoredAt)}.`, `Дата фіксації: ${formatLong(anchoredAt)}.`) })
    } else {
      lines.push({ status: "fail", title: tr("The registry holds a different record", "Реєстр містить інший запис"), detail: tr("The receipt was forged or issued for another registry.", "Квитанцію підроблено або видано для іншого реєстру.") })
    }
  } catch {
    lines.push({
      status: "fail",
      title: tr("Could not find the batch in the registry", "Не вдалося знайти партію в реєстрі"),
      detail: tr("The registry is unavailable, or the record was removed. In a demo registry the records can be lost when the server restarts.", "Реєстр недоступний, або запис видалено. У демонстраційній версії реєстр очищається при перезапуску сервера."),
    })
  }

  const failed = lines.some((l) => l.status === "fail")
  const state: Verdict["state"] = failed ? "fail" : fileHash === null ? "partial" : "ok"
  const headline =
    state === "ok"
      ? tr(`The document has not changed since ${formatLong(anchoredAt!)}`, `Документ не змінювали з ${formatLong(anchoredAt!)}`)
      : state === "partial"
        ? tr("The receipt is authentic. The file has not been checked yet", "Квитанція справжня. Файл ще не перевірено")
        : fileFailed
          ? tr("The file does not match the receipt", "Файл не відповідає квитанції")
          : tr("The receipt failed verification", "Квитанція не пройшла перевірку")

  return { state, headline, lines, anchoredAt, epoch: r.epoch, txHash, demoRegistry: r.network === "mock" }
}
