import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { ENV_FILE, getEnvValue, upsertEnv } from "./env-file";

/**
 * Creates the SERVICE wallet of the backend: a brand-new key used only to sign anchor
 * transactions. It is not your personal wallet. The private key is written straight to the
 * git-ignored backend/.env.local and is never printed; only the public address is shown.
 *
 *   npm run wallet:new
 */
async function main() {
  const existing = getEnvValue("ANCHOR_PRIVATE_KEY");
  if (existing) {
    const address = privateKeyToAccount((existing.startsWith("0x") ? existing : `0x${existing}`) as `0x${string}`).address;
    console.log("A service wallet already exists; it was left untouched.");
    console.log(`Address: ${address}`);
    return;
  }

  const key = generatePrivateKey();
  upsertEnv("ANCHOR_PRIVATE_KEY", key);
  const { address } = privateKeyToAccount(key);

  console.log("Service wallet created.");
  console.log(`Address: ${address}`);
  console.log(`The private key was saved to ${ENV_FILE} (git-ignored) and was not printed.\n`);
  console.log("Next:");
  console.log("  1. Get free test POL for the address above from the Polygon Amoy faucet");
  console.log("     (https://faucet.polygon.technology, choose Polygon Amoy).");
  console.log("  2. npm run deploy:amoy");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
