import { ethers } from 'ethers'
import { ChainId } from '@sushiswap/chain'
import { Limited } from '../Limited'
import { PoolCode } from '../pools/PoolCode'
import { Token } from '@sushiswap/currency'

export abstract class LiquidityProvider2 {
  limited: Limited
  chainDataProvider: ethers.providers.BaseProvider
  chainId: ChainId

  constructor(chainDataProvider: ethers.providers.BaseProvider, chainId: ChainId, l: Limited) {
    this.limited = l
    this.chainDataProvider = chainDataProvider
    this.chainId = chainId
  }

  // The name of liquidity provider to be used for pool naming. For example, 'Sushiswap'
  abstract getPoolProviderName(): string

  // To start ferch pools data. Can fetch data for the most used or big pools even before
  // to/from tokens are known
  abstract startFetchPoolsData(): void

  // start fetching pools data for token t, if it is not fetched before
  // call if for to and from tokens
  abstract fetchPoolsForToken(t: Token): void

  // Returns current pools data
  abstract getCurrentPoolList(): PoolCode[]

  // If pools data were chabged since last getCurrentPoolList() call
  abstract poolListWereUpdated(): boolean

  // Stops all network activity
  abstract stopFetchPoolsData(): void
}
