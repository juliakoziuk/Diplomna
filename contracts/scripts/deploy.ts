import hre from "hardhat";
import { formatEther, parseEther } from "viem";
import { upsertEnv } from "./env-file";

/**
 * Deploys MerkleAnchor with the service wallet (ANCHOR_PRIVATE_KEY) as the indexer, then saves the
 * contract address and chain settings to backend/.env.local so the backend starts anchoring on-chain.
 *
 *   npm run deploy:amoy        (Polygon Amoy testnet, free test POL)
 *   npm run deploy:polygon     (mainnet, real POL)
 *   npm run deploy:local       (a `hardhat node`; the wallet is funded automatically)
 *
 * Set WRITE_ENV=0 to deploy without touching backend/.env.local.
 */
async function main() {
  const network = hre.network.name;
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const address = deployer.account.address;

  let balance = await publicClient.getBalance({ address });
  if (balance === 0n && network === "localhost") {
    // A local node is ours to configure: give the service wallet some funds.
    const testClient = await hre.viem.getTestClient();
    await testClient.setBalance({ address, value: parseEther("100") });
    balance = await publicClient.getBalance({ address });
  }
  console.log(`Network:  ${network} (chain ${await publicClient.getChainId()})`);
  console.log(`Deployer: ${address}  balance ${formatEther(balance)}`);

  if (balance === 0n) {
    console.error(
      `\nThe service wallet has no funds on ${network}.\n` +
        (network === "amoy"
          ? "Get free test POL for this address at https://faucet.polygon.technology (choose Polygon Amoy) and run this again."
          : "Send it some POL for gas and run this again."),
    );
    process.exitCode = 1;
    return;
  }

  const contract = await hre.viem.deployContract("MerkleAnchor", [address]);
  console.log(`\nMerkleAnchor deployed at ${contract.address}`);

  if (process.env.WRITE_ENV !== "0" && network !== "hardhat") {
    const chainId = await publicClient.getChainId();
    upsertEnv("ANCHOR_CHAIN_ID", String(chainId));
    upsertEnv("ANCHOR_CONTRACT_DOCUMENTS", contract.address);
    if (process.env.ANCHOR_CHAIN_RPC_URL) upsertEnv("ANCHOR_CHAIN_RPC_URL", process.env.ANCHOR_CHAIN_RPC_URL);
    console.log("Saved ANCHOR_CHAIN_ID and ANCHOR_CONTRACT_DOCUMENTS to backend/.env.local. Restart the backend to start anchoring on-chain.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
