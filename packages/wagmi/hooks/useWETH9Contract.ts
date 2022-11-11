import { WNATIVE_ADDRESS } from '@sushiswap/currency'
import { useContract, useProvider } from 'wagmi'

import WETH9_ABI from '../abis/weth9.json'

export const getWETH9ContractConfig = (chainId: number | undefined) => ({
  address: chainId ? WNATIVE_ADDRESS[chainId] : '',
  abi: WETH9_ABI,
})

export function useWETH9Contract(chainId: number | undefined) {
  return useContract({
    ...getWETH9ContractConfig(chainId),
    signerOrProvider: useProvider({ chainId }),
  })
}
