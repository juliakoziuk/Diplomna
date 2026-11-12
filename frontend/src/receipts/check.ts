import { hashLeaf, verifyInclusionProof } from "verification-sdk"
import { DocumentReceipt, accountApi, chainApi } from "../api/account"
import { chainByName, networkLabel, readRootFromChain, txUrl } from "./chains"
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
  /** Registry the receipt points to, as written in it ("mock", "polygon-amoy", …). */
  network: string
  /** True when the receipt comes from the demo registry, not a public blockchain. */
  demoRegistry: boolean
  /** True for a public test network: free and public, but not permanent. */
  testnet: boolean
  /** Block-explorer link to the anchoring transaction, when there is one. */
  explorerTx: string | null
  /** Where the root was read from: straight from the chain, or relayed by our server. */
  via?: "chain" | "server" | "demo"
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

  const registry = await checkRegistry(r, lines)
  const { anchoredAt, txHash } = registry

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

  const chain = chainByName(r.network)
  return {
    state,
    headline,
    lines,
    anchoredAt,
    epoch: r.epoch,
    txHash: txHash ?? r.txHash,
    network: r.network,
    demoRegistry: r.network === "mock",
    testnet: r.network === "mock" ? false : chain?.testnet ?? false,
    explorerTx: r.network === "mock" ? null : txUrl(chain, txHash ?? r.txHash),
    via: registry.via,
  }
}

const toDate = (ts: number) => new Date(ts < 1e12 ? ts * 1000 : ts) // demo registry: ms, a chain: seconds

/**
 * Checks that the batch root of the receipt is recorded in the registry the receipt names.
 * Demo registry: asked from our server. A public chain: the browser reads the contract itself
 * (so our server cannot lie about it) after confirming the contract is the official one.
 */
async function checkRegistry(r: DocumentReceipt, lines: CheckLine[]): Promise<{ anchoredAt?: Date; txHash?: string; via?: "chain" | "server" | "demo" }> {
  const same = (root: string) => root.toLowerCase() === r.batchRoot.toLowerCase()
  const notFound: CheckLine = {
    status: "fail",
    title: tr("Could not find the batch in the registry", "Не вдалося знайти партію в реєстрі"),
    detail: tr("The registry is unavailable, or the record was removed. In a demo registry the records can be lost when the server restarts.", "Реєстр недоступний, або запис видалено. У демонстраційній версії реєстр очищається при перезапуску сервера."),
  }

  if (r.network === "mock") {
    try {
      const anchor = await accountApi.chainRoot(r.epoch, "mock")
      if (!same(anchor.root)) {
        lines.push({ status: "fail", title: tr("The registry holds a different record", "Реєстр містить інший запис"), detail: tr("The receipt was forged or issued for another registry.", "Квитанцію підроблено або видано для іншого реєстру.") })
        return { txHash: anchor.txHash ?? undefined, via: "demo" }
      }
      const anchoredAt = toDate(anchor.timestamp)
      lines.push({ status: "ok", title: tr("The batch is recorded in the registry", "Партію зафіксовано в реєстрі"), detail: tr(`Recorded on: ${formatLong(anchoredAt)}. This is a demo registry on our server.`, `Дата фіксації: ${formatLong(anchoredAt)}. Це демонстраційний реєстр на нашому сервері.`) })
      return { anchoredAt, txHash: anchor.txHash ?? undefined, via: "demo" }
    } catch {
      lines.push(notFound)
      return {}
    }
  }

  // A public blockchain.
  const chain = chainByName(r.network)
  if (!chain || !r.contract) {
    lines.push({ status: "fail", title: tr("Unknown registry", "Невідомий реєстр"), detail: tr(`The receipt names the network "${r.network}", which this verifier does not know.`, `Квитанція вказує мережу «${r.network}», яку цей верифікатор не знає.`) })
    return {}
  }

  // The contract must be OUR contract: anyone can deploy another one and fill it with fake roots.
  const info = await chainApi.info().catch(() => null)
  if (info?.enabled && info.contract) {
    if (info.contract.toLowerCase() === r.contract.toLowerCase() && info.network === r.network) {
      lines.push({ status: "ok", title: tr("The receipt points to the official contract", "Квитанція вказує на офіційний контракт"), detail: `${r.contract}` })
    } else {
      lines.push({ status: "fail", title: tr("The receipt points to a different contract", "Квитанція вказує на інший контракт"), detail: tr("It is not the contract this service writes to, so its roots cannot be trusted.", "Це не той контракт, у який пише цей сервіс, тож його кореням не можна довіряти.") })
      return {}
    }
  } else {
    lines.push({ status: "skip", title: tr("The official contract was not confirmed", "Офіційний контракт не підтверджено"), detail: tr("The server did not answer, so only the chain itself was checked.", "Сервер не відповів, тож перевірено лише сам блокчейн.") })
  }

  let onChain: { root: string; timestamp: number } | null
  let via: "chain" | "server" = "chain"
  try {
    onChain = await readRootFromChain(chain, r.contract, r.epoch)
  } catch {
    // The browser could not reach the chain's RPC (offline, blocked, CORS): fall back to our server.
    try {
      const a = await accountApi.chainRoot(r.epoch, r.network)
      onChain = { root: a.root, timestamp: a.timestamp }
      via = "server"
    } catch {
      lines.push(notFound)
      return {}
    }
  }
  if (!onChain) {
    lines.push({ ...notFound, detail: tr("The contract has no root for this epoch.", "У контракті немає кореня для цієї епохи.") })
    return {}
  }
  if (!same(onChain.root)) {
    lines.push({ status: "fail", title: tr("The blockchain holds a different root", "Блокчейн містить інший корінь"), detail: tr("The receipt was forged or does not belong to this registry.", "Квитанцію підроблено, або вона не з цього реєстру.") })
    return { via }
  }
  const anchoredAt = toDate(onChain.timestamp)
  lines.push({
    status: "ok",
    title: tr(`The batch is recorded on a public blockchain: ${networkLabel(r.network)}`, `Партію зафіксовано в публічному блокчейні: ${networkLabel(r.network)}`),
    detail:
      tr(`Recorded on: ${formatLong(anchoredAt)}.`, `Дата фіксації: ${formatLong(anchoredAt)}.`) +
      " " +
      (via === "chain"
        ? tr("Read directly from the blockchain by your browser.", "Прочитано з блокчейну безпосередньо вашим браузером.")
        : tr("Your browser could not reach the blockchain, so our server relayed it (less independent).", "Ваш браузер не зміг звернутися до блокчейну, тож його передав наш сервер (менш незалежно).")),
  })
  return { anchoredAt, via }
}
