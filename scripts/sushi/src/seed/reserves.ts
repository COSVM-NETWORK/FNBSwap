import '../lib/wagmi.js'

import { Prisma, PrismaClient } from '@prisma/client'
import { ChainId } from '@sushiswap/chain'
import { readContracts } from '@wagmi/core'
import { performance } from 'perf_hooks'

import { PoolType, ProtocolVersion } from '../config.js'

const CPP_RESERVES_ABI = [
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      {
        internalType: 'uint112',
        name: '_reserve0',
        type: 'uint112',
      },
      {
        internalType: 'uint112',
        name: '_reserve1',
        type: 'uint112',
      },
      {
        internalType: 'uint32',
        name: '_blockTimestampLast',
        type: 'uint32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]

const STABLE_RESERVES_ABI = [
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      {
        internalType: 'uint256',
        name: '_reserve0',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_reserve1',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]

const client = new PrismaClient()

const SUPPORTED_VERSIONS = [ProtocolVersion.V2, ProtocolVersion.LEGACY, ProtocolVersion.TRIDENT]
const SUPPORTED_TYPES = [PoolType.CONSTANT_PRODUCT_POOL, PoolType.STABLE_POOL]

export async function reserves(chainId: ChainId) {
  try {
    const startTime = performance.now()
    console.log(`RESERVES - CHAIN_ID: ${chainId}, VERSIONS: ${SUPPORTED_VERSIONS}, TYPE: ${SUPPORTED_TYPES}`)
    const pools = await getPools(chainId)
    const poolsWithReserve = await getReserves(chainId, pools)
    await updatePoolsWithReserve(chainId, poolsWithReserve)

    const endTime = performance.now()
    console.log(`COMPLETED (${((endTime - startTime) / 1000).toFixed(1)}s). `)
  } catch (e) {
    console.error(e)
    await client.$disconnect()
  } finally {
    await client.$disconnect()
  }
}

async function getPools(chainId: ChainId) {
  const startTime = performance.now()

  const batchSize = 2500
  let cursor = null
  const results = []
  let totalCount = 0
  do {
    const requestStartTime = performance.now()
    let result = []
    if (!cursor) {
      result = await getPoolsPagination(chainId, batchSize)
    } else {
      result = await getPoolsPagination(chainId, batchSize, 1, { id: cursor })
    }
    cursor = result.length == batchSize ? result[result.length - 1].id : null
    totalCount += result.length
    results.push(result)
    const requestEndTime = performance.now()
    console.log(
      `Fetched a batch of pool addresses with ${result.length} (${((requestEndTime - requestStartTime) / 1000).toFixed(
        1
      )}s). cursor: ${cursor}, total: ${totalCount}`
    )
  } while (cursor != null)

  const pools = results.flat()

  const endTime = performance.now()

  console.log(`Fetched ${pools.length} pool addresses (${((endTime - startTime) / 1000).toFixed(1)}s). `)
  return pools
}

async function getPoolsPagination(
  chainId: ChainId,
  take?: number,
  skip?: number,
  cursor?: Prisma.PoolWhereUniqueInput
) {
  return client.pool.findMany({
    take,
    skip,
    cursor,
    select: {
      id: true,
      address: true,
      type: true,
    },
    where: {
      chainId,
      version: {
        in: SUPPORTED_VERSIONS,
      },
      type: {
        in: SUPPORTED_TYPES,
      },
      isWhitelisted: true,
    },
  })
}

async function getReserves(
  chainId: ChainId,
  pools: {
    address: string
    id: string
    type: string
  }[]
) {
  const startTime = performance.now()
  const poolsWithReserve: PoolWithReserve[] = []
  const batchSize = pools.length > 2500 ? 2500 : pools.length

  let totalSuccessCount = 0
  let totalFailedCount = 0
  for (let i = 0; i < pools.length; i += batchSize) {
    const max = i + batchSize <= pools.length ? i + batchSize : i + (pools.length % batchSize)

    const batch = pools.slice(i, max).map((pool) => ({
      address: pool.address,
      chainId,
      abi: pool.type === PoolType.CONSTANT_PRODUCT_POOL ? CPP_RESERVES_ABI : STABLE_RESERVES_ABI,
      functionName: 'getReserves',
      allowFailure: true,
    }))
    const batchStartTime = performance.now()
    const reserves: any = await readContracts({
      contracts: batch,
    })

    let failures = 0
    const mappedPools = pools.slice(i, max).reduce<PoolWithReserve[]>((prev, pool, i) => {
      
      if (reserves[i] === null || reserves[i] === undefined) {
        failures++
        return prev
      }
      return [
        ...prev,
        {
          address: pool.address,
          reserve0: reserves[i][0].toString() as string,
          reserve1: reserves[i][1].toString() as string,
        },
      ]
    }, [])

    if (failures > 0) {
      console.log(`Failed to fetch reserves for ${failures} pools.`)
    }
    const batchEndTime = performance.now()
    totalFailedCount += failures
    totalSuccessCount += mappedPools.length
    console.log(
      `Fetched a batch with reserves, ${batchSize} (${(
        (batchEndTime - batchStartTime) /
        1000
      ).toFixed(1)}s). `
    )

    poolsWithReserve.push(...mappedPools)
  }

  const endTime = performance.now()

  console.log(
    `Finished fetching reserves for ${totalSuccessCount} pools, fails: ${totalFailedCount} (${(
      (endTime - startTime) /
      1000
    ).toFixed(1)}s). `
  )
  return poolsWithReserve
}

async function updatePoolsWithReserve(chainId: ChainId, pools: PoolWithReserve[]) {
  const startTime = performance.now()
  const batchSize = 250
  let updatedCount = 0

  for (let i = 0; i < pools.length; i += batchSize) {
    const batch = pools.slice(i, i + batchSize)
    const requests = batch.map((pool) => {
      const id = chainId.toString().concat(':').concat(pool.address.toLowerCase())
      return client.pool.update({
        select: { id: true }, // select only the `id` field, otherwise it returns everything and we don't use the data after updating.
        where: { id },
        data: {
          reserve0: pool.reserve0,
          reserve1: pool.reserve1,
        },
      })
    })
    const startTime = performance.now()
    const responses = await Promise.all(requests)
    const endTime = performance.now()
    updatedCount += responses.length
    console.log(
      `Updated ${responses.length} pools, ${updatedCount}/${pools.length} (${((endTime - startTime) / 1000).toFixed(
        1
      )}s).`
    )
  }
  const endTime = performance.now()
  console.log(`LOAD - Updated a total of ${updatedCount} pools (${((endTime - startTime) / 1000).toFixed(1)}s). `)
}

interface PoolWithReserve {
  address: string
  reserve0: string
  reserve1: string
}
