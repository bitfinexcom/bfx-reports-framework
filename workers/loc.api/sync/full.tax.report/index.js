'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')
const {
  getInsertableArrayObjectsFilter
} = require('../dao/helpers')

class FullTaxReport {
  constructor (
    dao,
    syncSchema,
    ALLOWED_COLLS,
    winLoss,
    positionsSnapshot
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.winLoss = winLoss
    this.positionsSnapshot = positionsSnapshot
  }

  _getPositionsSnapshotAndTickers (args) {
    const {
      auth = {},
      params = {}
    } = { ...args }
    const { mts: end = Date.now() } = { ...params }
    const _args = {
      auth,
      params: {
        end,
        isCertainMoment: true
      }
    }

    return this.positionsSnapshot
      .getPositionsSnapshotAndTickers(_args)
  }

  // TODO:
  _calcWinLossTotalAmount (winLoss) {
    if (
      !Array.isArray(winLoss) ||
      winLoss.length === 0
    ) {
      return null
    }
  }

  async _getMovements ({
    user = {},
    start = 0,
    end = Date.now()
  }) {
    const movementsModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.MOVEMENTS)
    const movementsMethodColl = this.syncSchema.getMethodCollMap()
      .get('_getMovements')

    const movementsBaseFilter = getInsertableArrayObjectsFilter(
      movementsMethodColl,
      {
        start,
        end
      }
    )

    const movements = await this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.MOVEMENTS,
      {
        filter: {
          ...movementsBaseFilter,
          user_id: user._id
        },
        sort: [['mtsUpdated', -1]],
        projection: movementsModel,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
    )

    if (!Array.isArray(movements)) {
      return []
    }

    return movements
  }

  // TODO:
  _calcMovementsTotalAmount (
    movements,
    {
      isDeposits,
      isWithdrawals
    }
  ) {
    if (
      !Array.isArray(movements) ||
      movements.length === 0
    ) {
      return null
    }
  }

  async getFullTaxReport ({
    auth = {},
    params: {
      timeframe = 'day',
      start = 0,
      end = Date.now()
    } = {}
  } = {}) {
    const user = await this.dao.checkAuthInDb({ auth })

    const args = {
      auth,
      params: {
        timeframe,
        start,
        end
      }
    }

    const winLoss = await this.winLoss.getWinLoss(args)
    const winLossTotalAmount = this._calcWinLossTotalAmount(winLoss)

    const {
      startPositionsSnapshot,
      startTickers
    } = await this._getPositionsSnapshotAndTickers({
      auth,
      params: { mts: start }
    })
    const {
      endPositionsSnapshot,
      endTickers
    } = await this._getPositionsSnapshotAndTickers({
      auth,
      params: { mts: end }
    })

    const movements = await this._getMovements({
      user,
      start,
      end
    })
    const movementsTotalAmount = this._calcMovementsTotalAmount(
      movements
    )
    const depositsTotalAmount = this._calcMovementsTotalAmount(
      movements,
      { isDeposits: true }
    )
    const withdrawalsTotalAmount = this._calcMovementsTotalAmount(
      movements,
      { isWithdrawals: true }
    )

    return {
      winLossTotalAmount,
      startPositionsSnapshot,
      startTickers,
      endPositionsSnapshot,
      endTickers,
      movements,
      movementsTotalAmount,
      depositsTotalAmount,
      withdrawalsTotalAmount
    }
  }
}

decorate(injectable(), FullTaxReport)
decorate(inject(TYPES.DAO), FullTaxReport, 0)
decorate(inject(TYPES.SyncSchema), FullTaxReport, 1)
decorate(inject(TYPES.ALLOWED_COLLS), FullTaxReport, 2)
decorate(inject(TYPES.WinLoss), FullTaxReport, 3)
decorate(inject(TYPES.PositionsSnapshot), FullTaxReport, 4)

module.exports = FullTaxReport
