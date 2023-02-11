/* eslint-disable @typescript-eslint/no-empty-function */
import type { ChainId } from '@sushiswap/chain'
import { Native, WNATIVE, WNATIVE_ADDRESS } from '@sushiswap/currency'
import { BridgeUnlimited, RToken } from '@sushiswap/tines'
import { Client } from 'viem'

import { NativeWrapBridgePoolCode } from '../pools/NativeWrapBridge'
import type { PoolCode } from '../pools/PoolCode'
import { LiquidityProvider, LiquidityProviders } from './LiquidityProvider'

export class NativeWrapProvider extends LiquidityProvider {
  poolCodes: PoolCode[]

  constructor(chainId: ChainId, client: Client) {
    super(chainId, client)
    const native = Native.onChain(chainId)
    const nativeRToken: RToken = {
      address: '',
      name: native.name,
      symbol: native.symbol,
      chainId: chainId,
    }
    const bridge = new BridgeUnlimited(WNATIVE_ADDRESS[chainId], nativeRToken, WNATIVE[chainId] as RToken, 0, 50_000)
    this.poolCodes = [new NativeWrapBridgePoolCode(bridge, LiquidityProviders.NativeWrap)]
    this.stateId = 0
    this.lastUpdateBlock = -1
  }

  getType(): LiquidityProviders {
    return LiquidityProviders.NativeWrap
  }

  getPoolProviderName(): string {
    return 'NativeWrap'
  }

  processBloom(bloom: string): void {
      
  }

  startFetchPoolsData() {}
  fetchPoolsForToken(): void {}
  getCurrentPoolList(): PoolCode[] {
    return this.poolCodes
  }
  stopFetchPoolsData() {}
}
