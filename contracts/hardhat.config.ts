import * as path from "path";
import * as dotenv from "dotenv";
import { HardhatUserConfig, subtask } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from "hardhat/builtin-tasks/task-names";
import "@nomicfoundation/hardhat-toolbox-viem";

// The service wallet and the RPC URL live in the backend's git-ignored env file, so the
// same values drive the backend and the deploy scripts. Nothing secret is stored here.
dotenv.config({ path: [path.join(__dirname, "..", "backend", ".env.local"), path.join(__dirname, "..", "backend", ".env")] });

// Compile with the pinned `solc` npm package (solc-js) instead of downloading a native compiler
// from binaries.soliditylang.org: reproducible, works offline and behind restrictive proxies.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args: { solcVersion: string }, _hre, runSuper) => {
  if (args.solcVersion === "0.8.24") {
    return {
      compilerPath: require.resolve("solc/soljson.js"),
      isSolcJs: true,
      version: args.solcVersion,
      longVersion: "0.8.24+commit.e11b9ed9.Emscripten.clang",
    };
  }
  return runSuper();
});

const key = process.env.ANCHOR_PRIVATE_KEY;
const accounts = key ? [key.startsWith("0x") ? key : `0x${key}`] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  // The first test pays for the cold start of the in-process chain.
  mocha: { timeout: 180_000 },
  networks: {
    // A local `hardhat node` for development; deploys with the service wallet too.
    localhost: { url: "http://127.0.0.1:8545", accounts },
    // Polygon Amoy: the public testnet (free test POL from a faucet).
    amoy: {
      url: process.env.ANCHOR_CHAIN_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts,
    },
    // Polygon PoS mainnet: real POL. Do not use before the testnet run is clean.
    polygon: {
      url: process.env.ANCHOR_CHAIN_RPC_URL || "https://polygon-rpc.com",
      chainId: 137,
      accounts,
    },
  },
};

export default config;
