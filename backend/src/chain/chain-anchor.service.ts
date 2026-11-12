import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, JsonRpcProvider, Network, Wallet, ZeroHash, isAddress } from 'ethers';

/** The slice of contracts/contracts/MerkleAnchor.sol the backend uses. */
const ABI = [
  'function anchorRoot(bytes32 root) returns (uint256 version)',
  'function getRoot(uint256 version) view returns (bytes32, uint64)',
  'event RootAnchored(uint256 indexed version, bytes32 root, uint64 timestamp)',
];

interface NetworkInfo {
  name: string;
  explorer?: string;
  /** A public RPC endpoint, used when ANCHOR_CHAIN_RPC_URL is not set. */
  rpc?: string;
}

const NETWORKS: Record<number, NetworkInfo> = {
  80002: { name: 'polygon-amoy', explorer: 'https://amoy.polygonscan.com', rpc: 'https://rpc-amoy.polygon.technology' },
  137: { name: 'polygon', explorer: 'https://polygonscan.com', rpc: 'https://polygon-rpc.com' },
  31337: { name: 'hardhat-local', rpc: 'http://127.0.0.1:8545' },
};

export interface ChainInfo {
  enabled: boolean;
  network: string;
  chainId: number | null;
  /** Address of the official MerkleAnchor contract: receipts must point to it. */
  contract: string | null;
  explorer: string | null;
}

export interface ChainAnchor {
  version: number;
  root: string;
  /** Seconds since the Unix epoch (block.timestamp). */
  timestamp: number;
  txHash: string;
}

/**
 * Anchors Merkle roots in a public blockchain (Polygon) through contracts/contracts/MerkleAnchor.sol,
 * signing with the service wallet. It stays OFF (the demo registry is used instead) until all of
 * ANCHOR_CHAIN_ID, ANCHOR_CONTRACT_DOCUMENTS and ANCHOR_PRIVATE_KEY are set; see docs/blockchain.md.
 */
@Injectable()
export class ChainAnchorService {
  private readonly logger = new Logger(ChainAnchorService.name);
  private readonly chainId: number | null;
  private readonly contractAddress: string | null;
  private readonly net: NetworkInfo | null;
  private readonly reader: Contract | null = null;
  private readonly writer: Contract | null = null;

  constructor(config: ConfigService) {
    const chainId = Number(config.get('ANCHOR_CHAIN_ID')) || null;
    const contract = (config.get<string>('ANCHOR_CONTRACT_DOCUMENTS') || '').trim();
    const key = (config.get<string>('ANCHOR_PRIVATE_KEY') || '').trim();
    this.chainId = chainId;
    this.net = chainId ? NETWORKS[chainId] ?? { name: `chain-${chainId}` } : null;
    this.contractAddress = isAddress(contract) ? contract : null;
    const rpc = (config.get<string>('ANCHOR_CHAIN_RPC_URL') || '').trim() || this.net?.rpc;

    if (!chainId || !this.contractAddress || !key || !rpc) {
      this.logger.log('on-chain anchoring is off (set ANCHOR_CHAIN_ID, ANCHOR_CONTRACT_DOCUMENTS and ANCHOR_PRIVATE_KEY to enable it)');
      return;
    }
    // staticNetwork: the chain id is known, so no extra detection requests are made.
    const provider = new JsonRpcProvider(rpc, Network.from(chainId), { staticNetwork: Network.from(chainId) });
    const wallet = new Wallet(key.startsWith('0x') ? key : `0x${key}`, provider);
    this.reader = new Contract(this.contractAddress, ABI, provider);
    this.writer = new Contract(this.contractAddress, ABI, wallet);
    this.logger.log(`on-chain anchoring ON: ${this.net!.name}, contract ${this.contractAddress}, signer ${wallet.address}`);
  }

  get enabled(): boolean {
    return !!this.writer;
  }

  /** Network name written into receipts, e.g. "polygon-amoy". */
  get network(): string {
    return this.net?.name ?? 'mock';
  }

  get contract(): string | null {
    return this.contractAddress;
  }

  info(): ChainInfo {
    return {
      enabled: this.enabled,
      network: this.enabled ? this.network : 'mock',
      chainId: this.enabled ? this.chainId : null,
      contract: this.enabled ? this.contractAddress : null,
      explorer: this.enabled ? this.net?.explorer ?? null : null,
    };
  }

  /** Sends the root to the contract and waits for the transaction to be mined. */
  async anchorRoot(root: string): Promise<ChainAnchor> {
    if (!this.writer) throw new Error('on-chain anchoring is not configured');
    try {
      const tx = await this.writer.anchorRoot(root);
      const receipt = await tx.wait(1, 180_000);
      if (!receipt || receipt.status !== 1) throw new Error(`transaction ${tx.hash} failed`);
      for (const log of receipt.logs) {
        const parsed = this.writer.interface.parseLog(log);
        if (parsed?.name === 'RootAnchored') {
          return {
            version: Number(parsed.args.version),
            root: String(parsed.args.root),
            timestamp: Number(parsed.args.timestamp),
            txHash: tx.hash,
          };
        }
      }
      throw new Error(`transaction ${tx.hash} mined without a RootAnchored event`);
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      if (/insufficient funds/i.test(message)) {
        throw new Error('the service wallet has no funds for gas: top it up (see docs/blockchain.md)');
      }
      throw err;
    }
  }

  /** Reads an anchored root straight from the contract; null when the version does not exist. */
  async getRoot(version: number): Promise<{ version: number; root: string; timestamp: number } | null> {
    if (!this.reader) return null;
    const [root, timestamp] = await this.reader.getRoot(version);
    if (root === ZeroHash) return null;
    return { version, root: String(root), timestamp: Number(timestamp) };
  }
}
