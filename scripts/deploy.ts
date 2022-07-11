import { ethers } from "hardhat"
import "dotenv/config"
import fs from "fs"

const BURN_ADDRESS = process.env.BURN_ADDRESS
const BATCH_GATEWAY = process.env.BATCH_GATEWAY
const RELAY_SERVER_URL = process.env.RELAY_SERVER_URL!
const TESTCHAIN_URL = process.env.TESTCHAIN_URL!
const DEVELOPER_ADDRESS = process.env.DEVELOPER_ADDRESS

async function main() {
  // /////////////////////////////////////////////////////////////////////////
  // Stake Manager
  // /////////////////////////////////////////////////////////////////////////
  const StakeManager = await ethers.getContractFactory("StakeManager")
  const maxUnstakeDelay = 30000
  const abandonmentDelay = 0
  const escheatmentDelay = 0

  const stakeManagerContract = await StakeManager.deploy(
    maxUnstakeDelay,
    abandonmentDelay,
    escheatmentDelay,
    BURN_ADDRESS,
    DEVELOPER_ADDRESS
  )
  await stakeManagerContract.deployed()
  console.log("StakeManager deployed at: ", stakeManagerContract.address)

  // /////////////////////////////////////////////////////////////////////////
  // Penalizer
  // /////////////////////////////////////////////////////////////////////////
  const Penalizer = await ethers.getContractFactory("Penalizer")
  const penalizeBlockDelay = 0
  const penalizeBlockExpiration = 0
  const penalizerContract = await Penalizer.deploy(
    penalizeBlockDelay,
    penalizeBlockExpiration
  )
  await penalizerContract.deployed()
  console.log("Penalizer deployed at: ", penalizerContract.address)

  // /////////////////////////////////////////////////////////////////////////
  // Relay Registrar
  // /////////////////////////////////////////////////////////////////////////
  const RelayRegistrar = await ethers.getContractFactory("RelayRegistrar")
  const relayRegistrationMaxAge = 180 * 24 * 3600
  const relayRegistrarContract = await RelayRegistrar.deploy(
    relayRegistrationMaxAge
  )
  await relayRegistrarContract.deployed()
  console.log("RelayRegistrar deployed at: ", relayRegistrarContract.address)

  // /////////////////////////////////////////////////////////////////////////
  // RelayHub
  // /////////////////////////////////////////////////////////////////////////
  const RelayHub = await ethers.getContractFactory("RelayHub")
  const stakeManager = stakeManagerContract.address
  const penalizer = penalizerContract.address
  const relayRegistrar = relayRegistrarContract.address
  const config = {
    maxWorkerCount: 1,
    gasReserve: 0,
    postOverhead: 0,
    gasOverhead: 0,
    // maximumRecipientDeposit: 0,
    minimumUnstakeDelay: 0,
    devAddress: DEVELOPER_ADDRESS,
    devFee: 0,
    // minimumStake: 0,
    // dataGasCostPerByte: 0,
    // externalCallDataCostOverhead: 0,
  }
  const relayHubContract = await RelayHub.deploy(
    stakeManager,
    penalizer,
    BATCH_GATEWAY,
    relayRegistrar,
    config
  )
  await relayHubContract.deployed()
  console.log("RelayHub deployed at: ", relayHubContract.address)

  // /////////////////////////////////////////////////////////////////////////
  // Forwarder
  // /////////////////////////////////////////////////////////////////////////
  const Forwarder = await ethers.getContractFactory("Forwarder")
  const forwarderContract = await Forwarder.deploy()
  await forwarderContract.deployed()
  console.log("Forwarder deployed at:", forwarderContract.address)

  // /////////////////////////////////////////////////////////////////////////
  // AcceptEverythingPaymaster
  // /////////////////////////////////////////////////////////////////////////
  const Paymaster = await ethers.getContractFactory("AcceptEverythingPaymaster")
  const paymasterContract = await Paymaster.deploy()
  await paymasterContract.deployed()
  console.log(
    "AcceptEverythingPaymaster deployed at:",
    paymasterContract.address
  )

  // /////////////////////////////////////////////////////////////////////////
  // ERC20 Token
  // /////////////////////////////////////////////////////////////////////////
  const GsnToken = await ethers.getContractFactory("GsnToken")
  const gsnTokenContract = await GsnToken.deploy(stakeManagerContract.address)
  await gsnTokenContract.deployed()
  console.log("GsnToken app deployed to:", gsnTokenContract.address)

  // /////////////////////////////////////////////////////////////////////////
  // Creating Configs files
  // /////////////////////////////////////////////////////////////////////////
  const configFile = "./gsn-relay-config.json"
  const envFile = "./.env.relay"
  const serverDirectory = "./server"

  const RELAY_HUB_ADDRESS = relayHubContract.address

  const TOKEN_ADDRESS = gsnTokenContract.address

  const configs = {
    config: configFile,
    baseRelayFee: 70,
    pctRelayFee: 0,
    ethereumNodeUrl: TESTCHAIN_URL,
    relayHubAddress: RELAY_HUB_ADDRESS,
    ownerAddress: DEVELOPER_ADDRESS,
    url: RELAY_SERVER_URL,
    managerStakeTokenAddress: TOKEN_ADDRESS,
    workdir: serverDirectory,
  }

  const envFileContent = `STAKE_MANAGER_ADDRESS="${stakeManagerContract.address}"
RELAY_HUB_ADDRESS="${relayHubContract.address}"
FORWARDER_ADDRESS="${forwarderContract.address}"
PAYMASTER_ADDRESS="${paymasterContract.address}"
TOKEN_ADDRESS="${gsnTokenContract.address}"
`

  const configFileContent = `${JSON.stringify(configs)}`
  const log = (file: string) => console.log(`Config file created at ${file}`)

  fs.writeFile(configFile, configFileContent, () => log(configFile))
  fs.writeFile(envFile, envFileContent, () => log(envFile))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
