import { ethers } from "hardhat"
import "dotenv/config"

async function main() {
  // /////////////////////////////////////////////////////////////////////////
  // Stake Manager
  // /////////////////////////////////////////////////////////////////////////
  const StakeManager = await ethers.getContractFactory("StakeManager")
  const maxUnstakeDelay = 30000
  const abandonmentDelay = 0
  const escheatmentDelay = 0
  const burnAddress = process.env.BURN_ADDRESS as string
  const devAddress = process.env.DEVELOPER_ADDRESS as string

  const stakeManagerContract = await StakeManager.deploy(
    maxUnstakeDelay,
    abandonmentDelay,
    escheatmentDelay,
    burnAddress,
    devAddress
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
  const batchGateway = process.env.BATCH_GATEWAY as string
  const relayRegistrar = relayRegistrarContract.address
  const config = {
    maxWorkerCount: 0,
    gasReserve: 0,
    postOverhead: 0,
    gasOverhead: 0,
    // maximumRecipientDeposit: 0,
    minimumUnstakeDelay: 0,
    devAddress: process.env.DEVELOPER_ADDRESS as string,
    devFee: 0,
    // minimumStake: 0,
    // dataGasCostPerByte: 0,
    // externalCallDataCostOverhead: 0,
  }
  const relayHubContract = await RelayHub.deploy(
    stakeManager,
    penalizer,
    batchGateway,
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
  const gsnTokenContract = await GsnToken.deploy()
  await gsnTokenContract.deployed()
  console.log("GsnToken app deployed to:", gsnTokenContract.address)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
