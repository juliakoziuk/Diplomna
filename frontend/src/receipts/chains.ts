import { tr } from "../i18n"

/**
 * Public chains a receipt can point to. The browser reads the anchored root straight from the
 * contract through one of these RPC endpoints, so verification does not rely on our server.
 * The RPC list is fixed here on purpose: a receipt must never choose where it is checked.
 */
export interface ChainDef {
  id: number
  name: string
  rpc: string[]
  explorer: string | null
  /** A test network: public and free, but not permanent and with no legal weight. */
  testnet: boolean
}

export const CHAINS: ChainDef[] = [
  { id: 80002, name: "polygon-amoy", rpc: ["https://rpc-amoy.polygon.technology", "https://polygon-amoy-bor-rpc.publicnode.com"], explorer: "https://amoy.polygonscan.com", testnet: true },
  { id: 137, name: "polygon", rpc: ["https://polygon-rpc.com", "https://polygon-bor-rpc.publicnode.com"], explorer: "https://polygonscan.com", testnet: false },
  { id: 31337, name: "hardhat-local", rpc: ["http://127.0.0.1:8545"], explorer: null, testnet: true },
]

/** Human name of a registry as written in receipts. */
export function networkLabel(name: string): string {
  switch (name) {
    case "mock": return tr("Demo registry", "Демонстраційний реєстр")
    case "polygon-amoy": return tr("Polygon Amoy (test network)", "Polygon Amoy (тестова мережа)")
    case "polygon": return "Polygon"
    case "hardhat-local": return tr("Local test chain", "Локальний тестовий ланцюг")
    default: return name
  }
}

export const chainByName = (name: string): ChainDef | undefined => CHAINS.find((c) => c.name === name)

export const txUrl = (chain: ChainDef | undefined, txHash: string): string | null =>
  chain?.explorer ? `${chain.explorer}/tx/${txHash}` : null

/** 4-byte selector of getRoot(uint256) in MerkleAnchor.sol (keccak256("getRoot(uint256)")). */
const GET_ROOT_SELECTOR = "0x9b24b3b0"

export interface OnChainRoot {
  root: string
  /** Seconds since the Unix epoch. */
  timestamp: number
}

/** eth_call to getRoot(version). Returns null when the version does not exist (zero root). */
export async function readRootFromChain(chain: ChainDef, contract: string, version: number): Promise<OnChainRoot | null> {
  const data = GET_ROOT_SELECTOR + BigInt(version).toString(16).padStart(64, "0")
  let lastError: unknown = new Error("no RPC endpoint")
  for (const url of chain.rpc) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: contract, data }, "latest"] }),
      })
      const body = await res.json()
      if (body.error) throw new Error(body.error.message ?? "RPC error")
      const hex: string = body.result ?? ""
      if (!/^0x[0-9a-fA-F]{128}$/.test(hex)) throw new Error("unexpected RPC answer")
      const root = "0x" + hex.slice(2, 66)
      const timestamp = Number(BigInt("0x" + hex.slice(66, 130)))
      return /^0x0+$/.test(root) ? null : { root, timestamp }
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}
