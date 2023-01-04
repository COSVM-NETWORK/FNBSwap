import { ChainId } from '@sushiswap/chain'
import {
  SUBGRAPH_HOST,
  SUSHISWAP_SUBGRAPH_NAME,
  SushiSwapChainId,
  TRIDENT_SUBGRAPH_NAME,
  TridentChainId,
} from '@sushiswap/graph-config'
import { isSushiSwapChain, isTridentChain } from '@sushiswap/validate'
import { erc20ABI, readContracts } from '@wagmi/core'
import { BigNumber } from 'ethers'

import { getBuiltGraphSDK} from '../../../.graphclient/index.js'
import { divBigNumberToNumber } from './utils.js'

interface Token {
  id: string
  symbol: string
  decimals: number
  liquidity: number
  derivedUSD: number
}

const getExchangeTokens = async (ids: string[], chainId: SushiSwapChainId): Promise<Token[]> => {
  const subgraphName = SUSHISWAP_SUBGRAPH_NAME[chainId]
  if (!subgraphName) return []
  const sdk = getBuiltGraphSDK({
    host: SUBGRAPH_HOST[chainId],
    name: subgraphName,
  })

  // waiting for new subgraph to sync
  const { tokens, bundle } = await sdk.Tokens({
    where: { id_in: ids.map((id) => id.toLowerCase()) },
  })

  return tokens.map((token) => ({
    id: token.id,
    symbol: token.symbol,
    decimals: Number(token.decimals),
    liquidity: Number(token.liquidity),
    derivedUSD: token.price.derivedNative * bundle?.nativePrice,
  }))
}

const getTridentTokens = async (ids: string[], chainId: TridentChainId): Promise<Token[]> => {
  const { getBuiltGraphSDK } = await import('../../../.graphclient/index.js')
  const subgraphName = TRIDENT_SUBGRAPH_NAME[chainId]
  if (!subgraphName) return []
  const sdk = getBuiltGraphSDK({
    host: SUBGRAPH_HOST[chainId],
    name: subgraphName,
  })

  const { tokens, bundle } = await sdk.Tokens({
    where: { id_in: ids.map((id) => id.toLowerCase()) },
  })

  return tokens.map((token) => ({
    id: token.id,
    symbol: token.symbol,
    decimals: Number(token.decimals),
    liquidity: divBigNumberToNumber(token.liquidity, token.decimals),
    derivedUSD: token.price?.derivedNative * bundle?.nativePrice,
  }))
}

export const getTokens = async (ids: string[], chainId: SushiSwapChainId | TridentChainId) => {
  const [exchangeTokens, tridentTokens] = await Promise.all([
    isSushiSwapChain(chainId) ? getExchangeTokens(ids, chainId) : [],
    isTridentChain(chainId) ? getTridentTokens(ids, chainId) : [],
  ])

  const betterTokens = ids
    .map((id) => {
      const exchangeToken = exchangeTokens.find((token) => token.id === id.toLowerCase())
      const tridentToken = tridentTokens.find((token) => token.id === id.toLowerCase())
      if (exchangeToken && tridentToken)
        return exchangeToken.liquidity > tridentToken.liquidity ? exchangeToken : tridentToken
      return exchangeToken ?? tridentToken ?? undefined
    })
    .filter((token) => token !== undefined) as Token[]

  return betterTokens
}

export async function getTokenBalancesOf(tokens: string[], address: string, chainId: ChainId) {
  const balanceOfCalls = tokens.map(
    (token) =>
      ({
        address: token,
        args: [address as `0x${string}`],
        chainId: chainId,
        abi: erc20ABI,
        functionName: 'balanceOf',
      } as const)
  )

  const decimalCalls = tokens.map(
    (token) =>
      ({
        address: token,
        chainId: chainId,
        abi: erc20ABI,
        functionName: 'decimals',
      } as const)
  )

  const result = await readContracts({
    allowFailure: true,
    contracts: [...balanceOfCalls, ...decimalCalls],
  })

  const balancesOf = result.splice(0, balanceOfCalls.length) as unknown as BigNumber[]
  const decimals = result.splice(0, decimalCalls.length) as unknown as number[]

  return tokens.map((token, i) => ({
    token,
    balance: divBigNumberToNumber(balancesOf[i], decimals[i]),
  }))
}
