import { useSlippageTolerance, useTrade as _useTrade } from '@sushiswap/react-query'
import { useFeeData } from 'wagmi'
import { useSwapState } from '../ui/trade/TradeProvider'
import { useCrossChainTrade } from './useCrossChainTrade'

export const useTrade = () => {
  const { token0, token1, network0, network1, amount, recipient } = useSwapState()

  const { data: slippageTolerance } = useSlippageTolerance()
  const { data: feeData } = useFeeData()
  const gasPrice = 177646622352 // TODO: REMOVE, temp
  const sameChainTrade = _useTrade({
    chainId: network0,
    fromToken: token0,
    toToken: token1,
    amount: amount,
    slippagePercentage: slippageTolerance === 'AUTO' ? '0.5' : slippageTolerance,
    // gasPrice: feeData?.gasPrice?.toNumber(),
    gasPrice,
    recipient,
    enabled: network0 === network1,
  })

  const crossChainTrade = useCrossChainTrade({
    chainId: network0,
    fromToken: token0,
    toToken: token1,
    amount: amount,
    slippagePercentage: slippageTolerance === 'AUTO' ? '0.5' : slippageTolerance,
    // gasPrice: feeData?.gasPrice?.toNumber(),
    gasPrice,
    recipient,
    enabled: network0 !== network1,
  })

  if (network0 === network1) return sameChainTrade
  return crossChainTrade
}
