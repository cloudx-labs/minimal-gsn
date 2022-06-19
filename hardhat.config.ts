import "@nomiclabs/hardhat-ethers"
import "@typechain/hardhat"
import "dotenv/config"
import { HardhatUserConfig } from "hardhat/config"

const testchainUrl = process.env.TESTCHAIN_URL as string
const testchainPrivateKey = process.env.TESTCHAIN_PRIVATE_KEY as string
const testchainChainId = process.env.TESTCHAIN_CHAIN_ID as string

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    testchain: {
      url: testchainUrl,
      chainId: +testchainChainId,
      accounts: [testchainPrivateKey],
    },
  },
  paths: {
    sources: "./contracts",
    cache: "./cache",
    tests: "./test",
    artifacts: "./abis",
  },
}

export default config
