'use client'

import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Chain, chainName } from '@sushiswap/chain'
import { shortenAddress } from '@sushiswap/format'
import { useSlippageTolerance } from '@sushiswap/react-query'
import { Currency } from '@sushiswap/ui13/components/currency'
import { Dialog } from '@sushiswap/ui13/components/dialog'
import { List } from '@sushiswap/ui13/components/list/List'
import React, { FC, useCallback, useState } from 'react'

import { useSwapActions, useSwapState } from './TradeProvider'
import { useTrade } from '../../lib/useTrade'
import numeral from 'numeral'
import { Button } from '@sushiswap/ui13/components/button'
import { ConfirmationDialog } from '../ConfirmationDialog'
import { Dots } from '@sushiswap/ui13/components/Dots'
import { FixedButtonContainer } from '../FixedButtonContainer'
import { Skeleton } from '@sushiswap/ui13/components/skeleton'
import { Drawer } from '@sushiswap/ui13/components/drawer'
import { Badge } from '@sushiswap/ui13/components/Badge'
import { AppType } from '@sushiswap/ui13/types'
import { Native } from '@sushiswap/currency'
import { classNames } from '@sushiswap/ui13'
import { warningSeverity, warningSeverityClassName } from '../../lib/warningSeverity'
import { TradeRoute } from './TradeRoute'

export const TradeReviewDialogSameChain: FC = () => {
  const [open, setOpen] = useState(false)
  const { appType, review, token0, token1, recipient, network0, amount, value } = useSwapState()
  const { setReview } = useSwapActions()
  const { data: slippageTolerance } = useSlippageTolerance()
  const { data: trade, isFetching } = useTrade()

  const onClose = useCallback(() => setReview(false), [setReview])
  const isWrap =
    appType === AppType.Swap && token0.isNative && token1.wrapped.address === Native.onChain(network0).wrapped.address
  const isUnwrap =
    appType === AppType.Swap && token1.isNative && token0.wrapped.address === Native.onChain(network0).wrapped.address
  const isSwap = !isWrap && !isUnwrap

  // Don't unmount this dialog since that will slow down the opening callback
  return (
    <Dialog open={review} unmount={false} onClose={onClose} variant="opaque">
      <div className="max-w-[504px] mx-auto">
        <button onClick={onClose} className="pl-0 p-3">
          <ArrowLeftIcon strokeWidth={3} width={24} height={24} />
        </button>
        <div className="flex justify-between gap-4 items-start py-2">
          <div className="flex flex-col flex-grow gap-1">
            {isFetching ? (
              <Skeleton.Text fontSize="text-3xl" className="w-2/3" />
            ) : (
              <h1 className="text-3xl font-semibold dark:text-slate-50">
                Buy {trade?.amountOut?.toSignificant(6)} {token1.symbol}
              </h1>
            )}
            <h1 className="text-lg font-medium text-gray-900 dark:text-slate-300">
              {isWrap ? 'Wrap' : isUnwrap ? 'Unwrap' : 'Sell'} {amount?.toSignificant(6)} {token0.symbol}
            </h1>
          </div>
          <div className="min-w-[56px] min-h-[56px]">
            <div className="pr-1">
              <Badge
                position="bottom-right"
                badgeContent={
                  <div className="bg-gray-100 rounded-full border-2 border-gray-100">
                    <PlusIcon
                      strokeWidth={2}
                      width={24}
                      height={24}
                      className="bg-blue text-white rounded-full p-0.5"
                    />
                  </div>
                }
              >
                <Currency.Icon currency={token1} width={56} height={56} />
              </Badge>
            </div>
          </div>
        </div>
        {warningSeverity(trade?.priceImpact) >= 3 && (
          <div className="rounded-xl px-4 py-3 bg-red/20 mt-4">
            <span className="text-red-600 font-medium text-sm">
              High price impact. You will lose a significant portion of your funds in this trade due to price impact.
            </span>
          </div>
        )}
        <div className="flex flex-col gap-3">
          <List>
            <List.Control>
              <List.KeyValue title="Network">{Chain.from(network0).name}</List.KeyValue>
              {isSwap && (
                <List.KeyValue
                  title="Price impact"
                  subtitle="The impact your trade has on the market price of this pool."
                >
                  <span
                    className={classNames(
                      warningSeverityClassName(warningSeverity(trade?.priceImpact)),
                      'text-gray-700 text-right dark:text-slate-400'
                    )}
                  >
                    {isFetching ? (
                      <Skeleton.Box className="h-4 py-0.5 w-[60px] rounded-md" />
                    ) : (
                      `${trade?.priceImpact?.toFixed(2) ?? 'N/A'}`
                    )}
                  </span>
                </List.KeyValue>
              )}
              {isSwap && (
                <List.KeyValue
                  title={`Min. received after slippage (${slippageTolerance === 'AUTO' ? '0.5' : slippageTolerance}%)`}
                  subtitle="The minimum amount you are guaranteed to receive."
                >
                  {isFetching ? (
                    <Skeleton.Text align="right" fontSize="text-sm" className="w-1/2" />
                  ) : (
                    `${trade?.minAmountOut?.toSignificant(6)} ${token1.symbol}`
                  )}
                </List.KeyValue>
              )}
              <List.KeyValue title="Network fee">
                {isFetching ? (
                  <Skeleton.Text align="right" fontSize="text-sm" className="w-1/3" />
                ) : (
                  `~$${trade?.gasSpent ?? '0.00'}`
                )}
              </List.KeyValue>
              {isSwap && (
                <List.KeyValue title="Route">
                  {isFetching ? (
                    <Skeleton.Text align="right" fontSize="text-sm" className="w-1/3" />
                  ) : (
                    <button onClick={() => setOpen(true)} className="text-sm text-blue font-semibold">
                      View Route
                    </button>
                  )}
                  <TradeRoute trade={trade} open={open} setOpen={setOpen} />
                </List.KeyValue>
              )}
            </List.Control>
          </List>
          {recipient && (
            <List className="!pt-2">
              <List.Control>
                <List.KeyValue title="Recipient">
                  <a
                    target="_blank"
                    href={Chain.fromChainId(network0)?.getAccountUrl(recipient) ?? '#'}
                    className="flex gap-2 items-center text-blue cursor-pointer"
                    rel="noreferrer"
                  >
                    {shortenAddress(recipient)}
                  </a>
                </List.KeyValue>
              </List.Control>
            </List>
          )}
        </div>
        <div className="pt-4">
          <ConfirmationDialog>
            {({ onClick, isWritePending, isLoading, isConfirming }) => (
              <Button
                fullWidth
                size="xl"
                loading={isLoading}
                onClick={onClick}
                disabled={isWritePending || Boolean(isLoading && +value > 0) || isFetching}
                color={warningSeverity(trade?.priceImpact) >= 3 ? 'red' : 'blue'}
              >
                {isConfirming ? (
                  <Dots>Confirming transaction</Dots>
                ) : isWritePending ? (
                  <Dots>Confirm Swap</Dots>
                ) : isWrap ? (
                  'Wrap'
                ) : isUnwrap ? (
                  'Unwrap'
                ) : (
                  `Swap ${token0.symbol} for ${token1.symbol}`
                )}
              </Button>
            )}
          </ConfirmationDialog>
        </div>
      </div>
    </Dialog>
  )
}