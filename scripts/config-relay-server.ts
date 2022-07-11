import { ethers } from "hardhat"
import { config } from "dotenv"
import TokenInterface from "../abis/contracts/GsnToken.sol/GsnToken.json"
import StakeManagerInterface from "../abis/@opengsn/contracts/src/StakeManager.sol/StakeManager.json"
import RelayHubInterface from "../abis/@opengsn/contracts/src/RelayHub.sol/RelayHub.json"
import PaymasterInterface from "../abis/@opengsn/paymasters/contracts/AcceptEverythingPaymaster.sol/AcceptEverythingPaymaster.json"
import ForwarderInterface from "../abis/@opengsn/contracts/src/forwarder/Forwarder.sol/Forwarder.json"
import fs from "fs"
// @ts-ignore
import HDKey from "ethereumjs-wallet/hdkey"
import { toHex } from "web3-utils"

const workdir = process.cwd()
const deployEnvVars = config({ path: `${workdir}/.env` })
const relayEnvVars = config({ path: `${workdir}/.env.relay` })

const TOKEN_ADDRESS = relayEnvVars.parsed?.TOKEN_ADDRESS!
const STAKE_MANAGER_ADDRESS = relayEnvVars.parsed?.STAKE_MANAGER_ADDRESS!
const RELAY_HUB_ADDRESS = relayEnvVars.parsed?.RELAY_HUB_ADDRESS!
const PAYMASTER_ADDRESS = relayEnvVars.parsed?.PAYMASTER_ADDRESS!
const FORWARDER_ADDRESS = relayEnvVars.parsed?.FORWARDER_ADDRESS!
const TESTCHAIN_URL = deployEnvVars.parsed?.TESTCHAIN_URL!
const TESTCHAIN_PRIVATE_KEY = deployEnvVars.parsed?.TESTCHAIN_PRIVATE_KEY!

const managerSeed = JSON.parse(
  fs.readFileSync("./server/manager/keystore", "utf8")
)
const workerSeed = JSON.parse(
  fs.readFileSync(`./server/workers/${RELAY_HUB_ADDRESS}/keystore`, "utf8")
)

const managerDeposit = ethers.utils.parseEther("1")
const workerDeposit = ethers.utils.parseEther("1")
const paymasterDeposit = ethers.utils.parseEther("7")
const amountTokens = 10
const unstakeDelay = 30000
const GsnRequestType = {
  typeName: "RelayRequest",
  typeSuffix:
    "RelayData relayData)RelayData(uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,uint256 pctRelayFee,uint256 baseRelayFee,uint256 transactionCalldataGasUsed,address relayWorker,address paymaster,address forwarder,bytes paymasterData,uint256 clientId)",
}
const GsnDomainSeparatorType = {
  prefix: "string name,string version",
  name: "GSN Relayed Transaction",
  version: "3",
}

async function main() {
  // /////////////////////////////////////////////////////////////////////////
  // 1- Config Relay Server
  // /////////////////////////////////////////////////////////////////////////
  const provider = ethers.getDefaultProvider(TESTCHAIN_URL)
  const wallet = new ethers.Wallet(TESTCHAIN_PRIVATE_KEY, provider)

  const hdkeyManager = HDKey.fromMasterSeed(managerSeed.seed)
  const hdkeyWorker = HDKey.fromMasterSeed(workerSeed.seed)
  const walletManager = hdkeyManager.deriveChild(0).getWallet()
  const walletWorker = hdkeyWorker.deriveChild(0).getWallet()

  const MANAGER_ADDRESS = toHex(walletManager.getAddress())
  const WORKER_ADDRESS = toHex(walletWorker.getAddress())

  // @ts-ignore
  const signer = await ethers.getSigner()

  const tokenContract = new ethers.Contract(
    TOKEN_ADDRESS,
    TokenInterface.abi,
    signer
  )
  const stakeManagerContract = new ethers.Contract(
    STAKE_MANAGER_ADDRESS,
    StakeManagerInterface.abi,
    signer
  )
  const relayHubContract = new ethers.Contract(
    RELAY_HUB_ADDRESS,
    RelayHubInterface.abi,
    signer
  )
  const paymasterContract = new ethers.Contract(
    PAYMASTER_ADDRESS,
    PaymasterInterface.abi,
    signer
  )
  const forwarderContract = new ethers.Contract(
    FORWARDER_ADDRESS,
    ForwarderInterface.abi,
    signer
  )

  console.log("Manager wallet address:", MANAGER_ADDRESS)
  console.log("Worker wallet address:", WORKER_ADDRESS)
  console.log("Deployer wallet address: ", await signer.getAddress())

  // send ether to Manager
  await wallet.sendTransaction({ to: MANAGER_ADDRESS, value: managerDeposit })
  console.log("1 - send ether to Manager: ✔️")
  // approve StakeManager to send $GSN
  await tokenContract.approve(STAKE_MANAGER_ADDRESS, amountTokens)
  console.log("2 - approve StakeManager to send $GSN: ✔️")
  // send ether to Worker
  await wallet.sendTransaction({ to: WORKER_ADDRESS, value: workerDeposit })
  console.log("3 - send ether to Worker: ✔️")
  // stake tokens
  await stakeManagerContract.stakeForRelayManager(
    TOKEN_ADDRESS,
    MANAGER_ADDRESS,
    unstakeDelay,
    amountTokens
  )
  console.log("4 - stake tokens: ✔️")
  // set minimun stake
  await relayHubContract.setMinimumStakes([TOKEN_ADDRESS], [amountTokens])
  console.log("5 - set minimun stake: ✔️")
  // authorize hub
  await stakeManagerContract.authorizeHubByOwner(
    MANAGER_ADDRESS,
    RELAY_HUB_ADDRESS
  )
  console.log("6 - authorize hub: ✔️")
  // set relay hub
  await paymasterContract.setRelayHub(RELAY_HUB_ADDRESS)
  console.log("7 - set relay hub : ✔️")
  // set trusted forwarder
  await paymasterContract.setTrustedForwarder(FORWARDER_ADDRESS)
  console.log("8 - set trusted forwarder : ✔️")
  // deposit paymaster
  await relayHubContract.depositFor(PAYMASTER_ADDRESS, {
    value: paymasterDeposit,
  })
  console.log("9 - deposit paymaster: ✔️")
  // register domain separator type
  await forwarderContract.registerDomainSeparator(
    GsnDomainSeparatorType.name,
    GsnDomainSeparatorType.version
  )
  console.log("10 - register domain separator type: ✔️")
  // register request type
  await forwarderContract.registerRequestType(
    GsnRequestType.typeName,
    GsnRequestType.typeSuffix
  )
  console.log("11 - register request type: ✔️")

  console.log("relay server: ✔️")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
