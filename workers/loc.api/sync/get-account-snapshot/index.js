'use strict'

const getPositionsSnapshot = require('../get-positions-snapshot')

module.exports = async (
  rService,
  args
) => {
  const { params = {} } = { ...args }
  const { end = Date.now() } = { ...params }
  const date = new Date(end)
  const dayMts = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1
  ) - 1
  const _args = {
    ...args,
    params: {
      ...params,
      end: dayMts
    }
  }

  const positionsSnapshot = await getPositionsSnapshot(
    rService,
    args
  )
  const walletsSnapshot = await rService.getWallets(
    null,
    _args
  )

  const res = {
    positionsSnapshot,
    walletsSnapshot
  }

  return res
}
