'use strict'

const ALLOWED_COLLS = require('../allowed.colls')
const { getModelsMap } = require('../schema')

const _getPositionsHistory = (
  dao,
  user,
  endMts,
  startMts
) => {
  const positionsHistoryModel = getModelsMap()
    .get(ALLOWED_COLLS.POSITIONS_HISTORY)

  return dao.getElemsInCollBy(
    ALLOWED_COLLS.POSITIONS_HISTORY,
    {
      filter: {
        user_id: user._id,
        $lte: { mtsCreate: endMts },
        $gte: { mtsUpdate: startMts }
      },
      sort: [['mtsUpdate', -1]],
      projection: positionsHistoryModel,
      exclude: ['user_id'],
      isExcludePrivate: true
    }
  )
}

const _findPositions = (
  positionsAudit,
  reqStatus,
  year,
  month,
  day
) => {
  return positionsAudit.find((posAudit) => {
    const { mtsUpdate, status } = { ...posAudit }

    if (!Number.isInteger(mtsUpdate)) {
      return false
    }

    const date = new Date(mtsUpdate)

    return (
      status === reqStatus &&
      year === date.getUTCFullYear() &&
      month === date.getUTCMonth() &&
      day === date.getUTCDate()
    )
  })
}

const _findActivePositions = (
  positionsAudit,
  year,
  month,
  day
) => {
  return _findPositions(
    positionsAudit,
    'ACTIVE',
    year,
    month,
    day
  )
}

const _findClosedPositions = (
  positionsAudit,
  year,
  month,
  day
) => {
  return _findPositions(
    positionsAudit,
    'CLOSED',
    year,
    month,
    day
  )
}

const _getPositionsHistoryIds = (positionsHistory) => {
  return positionsHistory.reduce(
    (accum, { id } = {}) => {
      if (Number.isInteger(id)) {
        accum.push(id)
      }

      return accum
    }, [])
}

const _getCalculatedPositions = async (
  rService,
  positions,
  end
) => {
  const res = []

  for (const position of positions) {
    const {
      symbol,
      basePrice,
      amount
    } = { ...position }

    const resPositions = {
      ...position,
      actualPrice: null,
      pl: null,
      plPerc: null
    }

    if (typeof symbol !== 'string') {
      res.push(resPositions)

      continue
    }

    const {
      res: publicTrades
    } = await rService._getPublicTrades({
      params: {
        symbol,
        end,
        limit: 1,
        notThrowError: true,
        notCheckNextPage: true
      }
    })

    if (
      !Array.isArray(publicTrades) ||
      publicTrades.length === 0 ||
      !publicTrades[0] ||
      typeof publicTrades[0] !== 'object' ||
      !Number.isFinite(publicTrades[0].price) ||
      !Number.isFinite(basePrice) ||
      !Number.isFinite(amount)
    ) {
      res.push(resPositions)

      continue
    }

    const actualPrice = publicTrades[0].price
    const pl = (actualPrice - basePrice) * Math.abs(amount)
    const plPerc = ((actualPrice / basePrice) - 1) * 100

    res.push({
      ...resPositions,
      actualPrice,
      pl,
      plPerc
    })
  }

  return res
}

const _filterDuplicate = (accum = [], curr = []) => {
  if (
    !Array.isArray(accum) ||
    accum.length === 0
  ) {
    return [...curr]
  }

  const keys = Object.keys(accum[0]).filter(key => !/^_/.test(key))

  return curr.filter(currItem => {
    return accum.every(accumItem => {
      return keys.some(key => {
        return accumItem[key] !== currItem[key]
      })
    })
  })
}

const _getPositionsAudit = async (
  rService,
  year,
  month,
  day,
  {
    auth = {},
    params: { ids } = {}
  } = {}
) => {
  const positionsAudit = []

  for (const id of ids) {
    const singleIdRes = []

    let end = Date.now()
    let prevEnd = end
    let serialRequestsCount = 0

    while (true) {
      const _res = await rService.getPositionsAudit(
        null,
        { auth, params: { id: [id], end, limit: 250 } }
      )

      const { res, nextPage } = (
        Object.keys({ ..._res }).every(key => key !== 'nextPage')
      )
        ? { res: _res, nextPage: null }
        : _res

      prevEnd = end
      end = nextPage

      if (
        Array.isArray(res) &&
        res.length === 0 &&
        nextPage &&
        Number.isInteger(nextPage) &&
        serialRequestsCount < 1
      ) {
        serialRequestsCount += 1

        continue
      }

      serialRequestsCount = 0

      if (
        !Array.isArray(res) ||
        res.length === 0
      ) {
        break
      }

      const closedPos = _findClosedPositions(
        res,
        year,
        month,
        day
      )

      if (
        closedPos &&
        typeof closedPos === 'object'
      ) {
        break
      }

      const activePos = _findActivePositions(
        res,
        year,
        month,
        day
      )

      if (
        activePos &&
        typeof activePos === 'object'
      ) {
        positionsAudit.push(activePos)

        break
      }

      const resWithoutDuplicate = _filterDuplicate(singleIdRes, res)
      singleIdRes.push(...resWithoutDuplicate)

      if (
        !Number.isInteger(nextPage) ||
        (
          resWithoutDuplicate.length === 0 &&
          end === prevEnd
        )
      ) {
        break
      }
    }
  }

  return positionsAudit
}

module.exports = async (
  rService,
  args
) => {
  const {
    auth = {},
    params = {}
  } = { ...args }
  const { end = Date.now() } = { ...params }
  const { dao } = rService
  const user = await rService.dao.checkAuthInDb({ auth })

  const date = new Date(end)
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const startMts = Date.UTC(year, month, day)
  const endMts = Date.UTC(year, month, day + 1) - 1

  const positionsHistory = await _getPositionsHistory(
    dao,
    user,
    endMts,
    startMts
  )

  if (
    !Array.isArray(positionsHistory) ||
    positionsHistory.length === 0
  ) {
    return []
  }

  const ids = _getPositionsHistoryIds(positionsHistory)
  const positionsAudit = await _getPositionsAudit(
    rService,
    year,
    month,
    day,
    { auth, params: { ids } }
  )

  if (
    !Array.isArray(positionsAudit) ||
    positionsAudit.length === 0
  ) {
    return []
  }

  const res = await _getCalculatedPositions(
    rService,
    positionsAudit,
    endMts
  )

  return res
}
