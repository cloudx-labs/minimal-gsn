// @ts-nocheck
import { ethers } from "hardhat"
import "dotenv/config"
import TokenInterface from '../abis/contracts/GsnToken.sol/GsnToken.json';
import StakeManagerInterface from '../abis/@opengsn/contracts/src/StakeManager.sol/StakeManager.json';
import RelayHubInterface from '../abis/@opengsn/contracts/src/RelayHub.sol/RelayHub.json';
import PaymasterInterface from '../abis/@opengsn/paymasters/contracts/AcceptEverythingPaymaster.sol/AcceptEverythingPaymaster.json';
import ForwarderInterface from '../abis/@opengsn/contracts/src/forwarder/Forwarder.sol/Forwarder.json';
import { TransactionResponse } from "@ethersproject/abstract-provider";


const MANAGER_ADDRESS = process.env.MANAGER_ADDRESS
const TOKEN_ADDRESS =  process.env.TOKEN_ADDRESS
const STAKE_MANAGER_ADDRESS = process.env.STAKE_MANAGER_ADDRESS 
const RELAY_HUB_ADDRESS = process.env.RELAY_HUB_ADDRESS 
const PAYMASTER_ADDRESS = process.env.PAYMASTER_ADDRESS 
const FORWARDER_ADDRESS = process.env.FORWARDER_ADDRESS

const TESTCHAIN_URL = process.env.TESTCHAIN_URL!
const TESTCHAIN_PRIVATE_KEY = process.env.TESTCHAIN_PRIVATE_KEY!

const amountInEther = ethers.utils.parseEther("1")
const paymasterDeposit = ethers.utils.parseEther("7")
const amountTokens = 10
const unstakeDelay = 30000

const GsnRequestType = {
  typeName: 'RelayRequest',
  typeSuffix: 'RelayData relayData)RelayData(uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,uint256 transactionCalldataGasUsed,address relayWorker,address paymaster,address forwarder,bytes paymasterData,uint256 clientId)'
}

const GsnDomainSeparatorType = {
  prefix: 'string name,string version',
  name: 'GSN Relayed Transaction',
  version: '3'
}

async function main() {
  // /////////////////////////////////////////////////////////////////////////
  // Config Relay Server
  // /////////////////////////////////////////////////////////////////////////
  let tx: TransactionResponse
  const provider = ethers.getDefaultProvider(TESTCHAIN_URL)
  const wallet = new ethers.Wallet(TESTCHAIN_PRIVATE_KEY, provider)
  const signer = await ethers.getSigner()

  const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TokenInterface.abi, signer);
  const stakeManagerContract = new ethers.Contract(STAKE_MANAGER_ADDRESS, StakeManagerInterface.abi, signer);
  const relayHubContract = new ethers.Contract(RELAY_HUB_ADDRESS, RelayHubInterface.abi, signer);
  const paymasterContract = new ethers.Contract(PAYMASTER_ADDRESS, PaymasterInterface.abi, signer);
  const forwarderContract = new ethers.Contract(FORWARDER_ADDRESS, ForwarderInterface.abi, signer);

  // send ether to Manager
  tx = await wallet.sendTransaction({ to: MANAGER_ADDRESS, value: amountInEther })
  await tx.wait()
  console.log("1 - send ether to Manager: ✔️")
  // approve StakeManager to send $GSN
  tx = await tokenContract.approve(STAKE_MANAGER_ADDRESS, amountTokens)
  await tx.wait()
  console.log("2 - approve StakeManager to send $GSN: ✔️")
  // stake tokens
  tx = await stakeManagerContract.stakeForRelayManager(TOKEN_ADDRESS, MANAGER_ADDRESS, unstakeDelay, amountTokens)
  await tx.wait()
  console.log("3 - stake tokens: ✔️")
  // set minimun stake
  tx = await relayHubContract.setMinimumStakes([TOKEN_ADDRESS], [amountTokens])
  await tx.wait()
  console.log("4 - set minimun stake: ✔️")
  // authorize hub
  tx = await stakeManagerContract.authorizeHubByOwner(MANAGER_ADDRESS, RELAY_HUB_ADDRESS)
  await tx.wait()
  console.log("5 - authorize hub: ✔️")
  // set relay hub 
  tx = await paymasterContract.setRelayHub(RELAY_HUB_ADDRESS)
  await tx.wait()
  console.log("6 - set relay hub : ✔️")
  // set trusted forwarder 
  tx = await paymasterContract.setTrustedForwarder(FORWARDER_ADDRESS)
  await tx.wait()
  console.log("7 - set trusted forwarder : ✔️")
  // deposit paymaster
  tx = await relayHubContract.depositFor(PAYMASTER_ADDRESS, { value: paymasterDeposit })
  await tx.wait()
  console.log("8 - deposit paymaster: ✔️")
  // register domain separator type
  tx = await forwarderContract.registerDomainSeparator(GsnDomainSeparatorType.name, GsnDomainSeparatorType.version)
  await tx.wait()
  console.log("9 - register domain separator type: ✔️")
  // register request type
  tx = await forwarderContract.registerRequestType(GsnRequestType.typeName, GsnRequestType.typeSuffix)
  await tx.wait()
  console.log("10 - register request type: ✔️")

  console.log("relay server: ✔️")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
