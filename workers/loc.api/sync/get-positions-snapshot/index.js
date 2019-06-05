'use strict'

const ALLOWED_COLLS = require('../allowed.colls')
const { getModelsMap } = require('../schema')

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
  const startMts = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  )
  const endMts = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1
  ) - 1

  const positionsHistoryModel = getModelsMap()
    .get(ALLOWED_COLLS.POSITIONS_HISTORY)

  const positionsHistory = await dao.getElemsInCollBy(
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

  if (
    !Array.isArray(positionsHistory) ||
    positionsHistory.length === 0
  ) {
    return []
  }

  return positionsHistory // TODO:
}
