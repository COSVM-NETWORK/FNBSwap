// import { Prisma, PrismaClient } from '@prisma/client'
// import { ChainId, chainName } from '@sushiswap/chain'
// import { performance } from 'perf_hooks'
// import { getBuiltGraphSDK, PairsQuery } from '../../../../.graphclient/index.js'
// import { PoolType, ProtocolName, ProtocolVersion } from '../../../config.js'
// import { createPools, getLatestPoolTimestamp } from '../../../etl/pool/load.js'
// import { createTokens } from '../../../etl/token/load.js'
// import { GRAPH_HOST, SWAPFISH_SUBGRAPH_NAME, SWAPFISH_SUPPORTED_CHAINS } from '../config.js'

// const client = new PrismaClient()
// const PROTOCOL = ProtocolName.SWAPFISH
// const VERSION = ProtocolVersion.V2
// TODO: Fees can change, see https://github.com/swapfish/contracts/blob/main/swap/UniswapV2Pair.sol#L189-L190
// const SWAP_FEE = 0.003
// const TWAP_ENABLED = true

// const FIRST_TIME_SEED = process.env.FIRST_TIME_SEED === 'true'
// if (FIRST_TIME_SEED) {
//   console.log('FIRST_TIME_SEED is true')
// }

// async function main() {
//   const startTime = performance.now()
//   console.log(`Preparing to load pools/tokens, protocol: ${PROTOCOL}`)

//   await start()

//   const endTime = performance.now()
//   console.log(`COMPLETE - Script ran for ${((endTime - startTime) / 1000).toFixed(1)} seconds. `)
// }

// async function start() {
//   console.log(
//     `Fetching pools from ${PROTOCOL} ${VERSION}, chains: ${SWAPFISH_SUPPORTED_CHAINS.map(
//       (chainId) => chainName[chainId]
//     ).join(', ')}`
//   )

//   let totalPairCount = 0
//   for (const chainId of SWAPFISH_SUPPORTED_CHAINS) {
//     let latestPoolTimestamp: string | null = null
//     if (!FIRST_TIME_SEED) {
//       latestPoolTimestamp = await getLatestPoolTimestamp(client, chainId, PROTOCOL, [VERSION])
//     }
//     const sdk = getBuiltGraphSDK({ chainId, host: GRAPH_HOST[chainId], name: SWAPFISH_SUBGRAPH_NAME[chainId] })
//     if (!SWAPFISH_SUBGRAPH_NAME[chainId]) {
//       console.log(`Subgraph not found: ${chainId} ${SWAPFISH_SUBGRAPH_NAME[chainId]}, Skipping`)
//       continue
//     }
//     console.log(`Loading data from chain: ${chainName[chainId]}(${chainId}), ${SWAPFISH_SUBGRAPH_NAME[chainId]}`)
//     let pairCount = 0
//     let cursor = ''

//     do {
//       const startTime = performance.now()
//       let where = {}
//       if (latestPoolTimestamp) {
//         where =
//           cursor !== ''
//             ? { id_gt: cursor, createdAtTimestamp_gt: latestPoolTimestamp }
//             : { createdAtTimestamp_gt: latestPoolTimestamp }
//       } else {
//         where = cursor !== '' ? { id_gt: cursor } : {}
//       }
//       const request = await sdk
//         .Pairs({
//           first: 1000,
//           where,
//         })
//         .catch((e: string) => {
//           console.log({ e })
//           return undefined
//         })
//         .catch(() => undefined)
//       const currentResultCount = request?.pairs.length ?? 0
//       const endTime = performance.now()

//       pairCount += currentResultCount
//       console.log(
//         `EXTRACT - extracted ${currentResultCount} pools, current total: ${pairCount}, cursor: ${cursor} (${(
//           (endTime - startTime) /
//           1000
//         ).toFixed(1)}s) `
//       )

//       if (request) {
//         const { tokens, pools } = transform(chainId, request)
//         // NOTE: This shouldn't have to be async, but was seeing this error:
//         // (unlocked closed connection) (CallerID: planetscale-admin)'
//         // this script doesn't have to be super fast, so keeping it async to not throttle the db
//         await Promise.all([createTokens(client, tokens), createPools(client, pools)])
//       }

//       const newCursor = request?.pairs[request.pairs.length - 1]?.id ?? ''
//       cursor = newCursor
//     } while (cursor !== '')
//     totalPairCount += pairCount
//     console.log(
//       `Finished loading pairs from ${GRAPH_HOST[chainId]}/${SWAPFISH_SUBGRAPH_NAME[chainId]}, ${pairCount} pairs`
//     )
//   }
//   console.log(`Finished loading pairs for ${PROTOCOL} from all subgraphs, ${totalPairCount} pairs`)
// }

// function transform(
//   chainId: ChainId,
//   data: PairsQuery
// ): {
//   pools: Prisma.PoolCreateManyInput[]
//   tokens: Prisma.TokenCreateManyInput[]
// } {
//   const tokens: Prisma.TokenCreateManyInput[] = []
//   const uniqueTokens: Set<string> = new Set()
//   const poolsTransformed = data.pairs.map((pair) => {
//     if (!uniqueTokens.has(pair.token0.id)) {
//       uniqueTokens.add(pair.token0.id)
//       tokens.push(
//         Prisma.validator<Prisma.TokenCreateManyInput>()({
//           id: chainId.toString().concat(':').concat(pair.token0.id),
//           address: pair.token0.id,
//           chainId,
//           name: pair.token0.name,
//           symbol: pair.token0.symbol,
//           decimals: Number(pair.token0.decimals),
//         })
//       )
//     }
//     if (!uniqueTokens.has(pair.token1.id)) {
//       uniqueTokens.add(pair.token1.id)
//       tokens.push(
//         Prisma.validator<Prisma.TokenCreateManyInput>()({
//           id: chainId.toString().concat(':').concat(pair.token1.id),
//           address: pair.token1.id,
//           chainId: chainId,
//           name: pair.token1.name,
//           symbol: pair.token1.symbol,
//           decimals: Number(pair.token1.decimals),
//         })
//       )
//     }

//     const regex = /([^\w ]|_|-)/g
//     const name = pair.token0.symbol
//       .replace(regex, '')
//       .slice(0, 15)
//       .concat('-')
//       .concat(pair.token1.symbol.replace(regex, '').slice(0, 15))
//     return Prisma.validator<Prisma.PoolCreateManyInput>()({
//       id: chainId.toString().concat(':').concat(pair.id),
//       address: pair.id,
//       name,
//       protocol: PROTOCOL,
//       version: VERSION,
//       type: PoolType.CONSTANT_PRODUCT_POOL,
//       chainId,
//       swapFee: SWAP_FEE,
//       twapEnabled: TWAP_ENABLED,
//       token0Id: chainId.toString().concat(':').concat(pair.token0.id),
//       token1Id: chainId.toString().concat(':').concat(pair.token1.id),
//       liquidityUSD: 0,
//     })
//   })

//   return { pools: poolsTransformed, tokens }
// }

// main()
//   .then(async () => {
//     await client.$disconnect()
//   })
//   .catch(async (e) => {
//     console.error(e)
//     await client.$disconnect()
//     process.exit(1)
//   })
