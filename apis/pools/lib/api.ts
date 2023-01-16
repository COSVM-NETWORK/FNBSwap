import prisma, { Prisma } from '@sushiswap/database'

import type { PoolType } from '.'

export type PoolApiArgs = {
  chainIds: number[] | undefined
  poolType: PoolType | undefined
  isIncentivized: boolean | undefined
  isWhitelisted: boolean | undefined
  cursor: string | undefined
  orderBy: string
  orderDir: 'asc' | 'desc'
}

export async function getPool(chainId: number, address: string) {
  const id = `${chainId}:${address.toLowerCase()}`
  const pool = await prisma.sushiPool.findFirstOrThrow({
    include: {
      token0: true,
      token1: true,
      incentives: true,
    },
    where: {
      id,
    },
  })

  await prisma.$disconnect()
  return pool
}

export async function getPools(args: PoolApiArgs) {
  const orderBy = { [args.orderBy]: args.orderDir }

  let where = {}
  let skip = 0
  let cursor = {}

  if (args.chainIds) {
    where = {
      chainId: { in: args.chainIds },
    }
  }

  if (args.poolType) {
    where = {
      type: args.poolType,
      ...where,
    }
  }

  if (args.isIncentivized) {
    where = {
      isIncentivized: args.isIncentivized,
      ...where,
    }
  }

  if (args.cursor) {
    skip = 1
    cursor = {
      cursor: { id: args.cursor },
    }
  }

  if (args.isWhitelisted) {
    where = {
      token0: {
        status: 'APPROVED',
      },
      token1: {
        status: 'APPROVED',
      },
      ...where,
    }
  }

  const select = Prisma.validator<Prisma.SushiPoolSelect>()({
    id: true,
    address: true,
    name: true,
    chainId: true,
    version: true,
    type: true,
    swapFee: true,
    twapEnabled: true,
    liquidityUSD: true,
    volumeUSD: true,
    apr: true,
    totalApr: true,
    isIncentivized: true,
    volume1d: true,
    fees1d: true,
    volume1w: true,
    fees1w: true,
    isBlacklisted: true,
    token0: {
      select: {
        id: true,
        address: true,
        name: true,
        symbol: true,
        decimals: true,
      },
    },
    token1: {
      select: {
        id: true,
        address: true,
        name: true,
        symbol: true,
        decimals: true,
      },
    },
    incentives: {
      select: {
        id: true,
        chainId: true,
        type: true,
        apr: true,
        rewardPerDay: true,
        rewardToken: {
          select: {
            id: true,
            address: true,
            name: true,
            symbol: true,
            decimals: true,
          },
        },
      },
    },
  })

  const pools = await prisma.sushiPool.findMany({
    select,
    take: 20,
    skip,
    ...cursor,
    where,
    orderBy,
  })

  await prisma.$disconnect()
  return pools ? pools : []
}
