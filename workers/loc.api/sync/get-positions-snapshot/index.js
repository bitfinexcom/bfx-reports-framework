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

// TODO:
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
  const { res: positionsAudit } = await rService.getPositionsAudit(
    null,
    { auth, params: { id: [...ids] } }
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

  return positions // TODO:
}
