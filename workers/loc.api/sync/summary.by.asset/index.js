'use strict'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.BalanceHistory,
  TYPES.FOREX_SYMBS,
  TYPES.Authenticator,
  TYPES.SYNC_API_METHODS,
  TYPES.Movements,
  TYPES.Wallets
]
class SummaryByAsset {
  constructor (
    dao,
    syncSchema,
    balanceHistory,
    FOREX_SYMBS,
    authenticator,
    SYNC_API_METHODS,
    movements,
    wallets
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.balanceHistory = balanceHistory
    this.FOREX_SYMBS = FOREX_SYMBS
    this.authenticator = authenticator
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.movements = movements
    this.wallets = wallets

    this.movementsMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.MOVEMENTS)
    this.ledgersMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.LEDGERS)
    this.movementsSymbolFieldName = this.movementsMethodColl.symbolFieldName
    this.ledgersSymbolFieldName = this.ledgersMethodColl.symbolFieldName
  }

  // TODO:
  async getSummaryByAsset (args) {
    const auth = args?.auth ?? {}
    const user = await this.authenticator
      .verifyRequestUser({ auth })

    // TODO: mock data
    return [
      {
        currency: 'BTC',
        balance: 12.32,
        balanceUsd: 246_400,
        valueChange30dUsd: 246_400, // means the difference between the value 30 days ago and the current value
        result30dUsd: 246_400, // show the value change without the deposit/withdrawals
        volume30dUsd: 246_400 //  means traded, lended, funded volume for 30 days period
      }
    ]
  }
}

decorateInjectable(SummaryByAsset, depsTypes)

module.exports = SummaryByAsset
