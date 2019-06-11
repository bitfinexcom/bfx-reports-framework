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

const _getClosedPosition = (
  positionsHistory,
  posAudit
) => {
  const { id } = { ...posAudit }

  const posHist = positionsHistory.find(({ status, id: posHistId }) => (
    status === 'CLOSED' &&
    id === posHistId
  ))

  return posHist || posAudit
}

const _filterPositions = (
  positionsAudit,
  positionsHistory,
  year,
  month,
  day
) => {
  return positionsAudit.reduce(
    (accum, posAudit) => {
      const { mtsUpdate, status } = { ...posAudit }

      if (!Number.isInteger(mtsUpdate)) {
        return accum
      }

      const date = new Date(mtsUpdate)

      if (
        year === date.getUTCFullYear() &&
        month === date.getUTCMonth() &&
        day === date.getUTCDate()
      ) {
        if (status === 'CLOSED') {
          const closedPosition = _getClosedPosition(
            positionsHistory,
            posAudit
          )

          accum.push(closedPosition)

          return accum
        }

        accum.push(posAudit)
      }

      return accum
    }, [])
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

const _getPositionsWithActualPrice = async (
  dao,
  auth,
  positions
) => {
  const res = []

  for (const position of positions) {
    const { mtsUpdate, symbol } = { ...position }

    if (
      !Number.isInteger(mtsUpdate) ||
      typeof symbol !== 'string'
    ) {
      res.push({ ...position, actualPrice: null })

      continue
    }

    const trades = await dao.findInCollBy(
      '_getTrades',
      {
        auth,
        params: {
          symbol,
          end: mtsUpdate,
          limit: 1
        }
      }
    )

    if (
      !Array.isArray(trades) ||
      trades.length === 0 ||
      !trades[0] ||
      typeof trades[0] !== 'object' ||
      !Number.isFinite(trades[0].execPrice)
    ) {
      res.push({ ...position, actualPrice: null })

      continue
    }

    res.push({
      ...position,
      actualPrice: trades[0].execPrice
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
  {
    auth = {},
    params: { ids } = {}
  } = {}
) => {
  const positionsAudit = []

  for (const id of ids) {
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

      const resWithoutDuplicate = _filterDuplicate(positionsAudit, res)
      positionsAudit.push(...resWithoutDuplicate)

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
  {
    auth = {},
    params: {
      end = Date.now()
    } = {}
  } = {}
) => {
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
    { auth, params: { ids } }
  )

  if (
    !Array.isArray(positionsAudit) ||
    positionsAudit.length === 0
  ) {
    return []
  }

  const positions = _filterPositions(
    positionsAudit,
    positionsHistory,
    year,
    month,
    day
  )

  const res = await _getPositionsWithActualPrice(
    dao,
    auth,
    positions
  )

  return res
}
