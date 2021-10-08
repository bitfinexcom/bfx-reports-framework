'use strict'

const {
  getStartMtsByTimeframe,
  calcGroupedData,
  groupByTimeframe,
  isForexSymb
} = require('../helpers')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.BalanceHistory,
  TYPES.PositionsSnapshot,
  TYPES.FOREX_SYMBS,
  TYPES.Authenticator,
  TYPES.SYNC_API_METHODS,
  TYPES.Movements
]
class WinLossVSAccountBalance {
  constructor (
    dao,
    syncSchema,
    balanceHistory,
    positionsSnapshot,
    FOREX_SYMBS,
    authenticator,
    SYNC_API_METHODS,
    movements
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.balanceHistory = balanceHistory
    this.positionsSnapshot = positionsSnapshot
    this.FOREX_SYMBS = FOREX_SYMBS
    this.authenticator = authenticator
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.movements = movements

    this.movementsMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.MOVEMENTS)
    this.movementsSymbolFieldName = this.movementsMethodColl.symbolFieldName
  }

  async getWinLossVSAccountBalance (_args = {}) {
    const {
      auth = {},
      params = {}
    } = _args ?? {}
    const user = await this.authenticator
      .verifyRequestUser({ auth })

    const {
      timeframe = 'day',
      start = 0,
      end = Date.now()
    } = params ?? {}
    const args = {
      auth: user,
      params: {
        timeframe,
        start,
        end
      }
    }
  }
}

decorateInjectable(WinLossVSAccountBalance, depsTypes)

module.exports = WinLossVSAccountBalance
