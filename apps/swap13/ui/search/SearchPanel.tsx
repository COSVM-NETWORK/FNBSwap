import { Chain } from '@sushiswap/chain'
import { useDebounce } from '@sushiswap/hooks'
import { Search } from '@sushiswap/ui13/components/input/Search'
import React, { FC, useCallback, useMemo, useState } from 'react'

import { useSearchContext } from './SearchProvider'
import { List } from '@sushiswap/ui13/components/list/List'
import { useTokenList } from '@sushiswap/react-query/hooks/tokenlist/useTokenList'
import { TokenWithLogoURIType, usePrice } from '@sushiswap/react-query'
import { Badge } from '@sushiswap/ui13/components/Badge'
import { NetworkIcon } from '@sushiswap/ui13/components/icons'
import { classNames } from '@sushiswap/ui13'
import { Skeleton } from '@sushiswap/ui13/components/skeleton'
import { Dialog } from '@sushiswap/ui13/components/dialog'

const POPULAR_TOKENS = [
  '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  '0xdac17f958d2ee523a2206206994597c13d831ec7',
  '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
]

export const SearchPanel: FC = () => {
  const [query, setQuery] = useState<string>()
  const debouncedQuery = useDebounce(query, 500)
  const filter = useMemo(() => (debouncedQuery ? [debouncedQuery] : 'showNone'), [debouncedQuery])

  const { data: tokenList } = useTokenList(filter)
  const { data: popularTokensList } = useTokenList(POPULAR_TOKENS)
  const { open, setOpen } = useSearchContext()

  const onClose = useCallback(() => setOpen(false), [setOpen])
  const isLoading = Boolean(query !== debouncedQuery && query && query?.length > 2)

  return (
    <Dialog variant="opaque" open={open} onClose={onClose} className="fixed inset-0 z-[1080]">
      <div>
        <Search id="search-input" loading={isLoading} onChange={setQuery} value={query ?? ''} />
        <div className="scroll relative">
          {query && query.length > 2 && (
            <List className="pt-6">
              <List.Label className="text-sm">Search results</List.Label>
              <List.Control className="scroll max-h-[368px]">
                {isLoading ? (
                  <RowSkeleton />
                ) : tokenList && Object.keys(tokenList).length > 0 ? (
                  Object.values(tokenList).map((el, i) => <Row currency={el} key={`example-${i}-${el.address}`} />)
                ) : (
                  <div className="h-[60px] flex items-center justify-center text-xs font-semibold text-gray-400 dark:text-slate-500">
                    No results found
                  </div>
                )}
              </List.Control>
            </List>
          )}
          <List className="pt-6">
            <List.Label className="text-sm">Popular tokens</List.Label>
            <List.Control>
              {popularTokensList &&
                Object.values(popularTokensList)?.map((el) => <Row currency={el} key={`example-${el.address}`} />)}
            </List.Control>
          </List>
        </div>
      </div>
    </Dialog>
  )
}

const Row: FC<{ currency: TokenWithLogoURIType }> = ({ currency }) => {
  const { data: price, isLoading } = usePrice({ address: currency.address, chainId: currency.chainId })
  const change = 0.08

  if (isLoading) return <RowSkeleton />

  return (
    <a
      href={`/swap13/${currency.chainId}/${currency.chainId}/ETH/${currency.address.toLowerCase()}`}
      role="button"
      className="cursor-pointer flex justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
    >
      <div className="flex items-center gap-5">
        <div className="w-9 h-9">
          <Badge
            position="bottom-right"
            badgeContent={<NetworkIcon chainId={currency.chainId} width={20} height={20} />}
          >
            <img
              placeholder="blur"
              key={currency.logoURI}
              src={currency.logoURI}
              width={36}
              height={36}
              alt={currency.name}
              className="rounded-full"
            />
          </Badge>
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-slate-100">{currency.name}</span>
          <div className="flex gap-1 items-center">
            <span className="font-medium text-sm text-gray-500 dark:text-slate-400">{currency.symbol}</span>
          </div>
        </div>
      </div>
      {price && (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-slate-100 text-right">${price?.toFixed(2)}</span>
          <span
            className={classNames(
              change > 0 ? 'text-green' : 'text-red',
              'font-medium text-sm text-gray-500 dark:text-slate-400 text-right'
            )}
          >
            {change}%
          </span>
        </div>
      )}
    </a>
  )
}

const RowSkeleton = () => {
  return (
    <div className="flex justify-between px-3 py-2 rounded-lg">
      <div className="flex w-2/4 items-center gap-5">
        <div className="w-9 h-9">
          <Badge position="bottom-right" badgeContent={<Skeleton.Circle radius={20} />}>
            <Skeleton.Circle radius={36} />
          </Badge>
        </div>
        <div className="flex flex-col gap-0.5 flex-grow">
          <Skeleton.Text />
          <Skeleton.Text fontSize="text-sm" className="w-1/2" />
        </div>
      </div>
      <div className="flex flex-col w-1/4 items-center">
        <Skeleton.Text className="w-1/2" align="right" />
        <Skeleton.Text fontSize="text-sm" className="w-1/3" align="right" />
      </div>
    </div>
  )
}
