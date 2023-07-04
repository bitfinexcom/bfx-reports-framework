'use strict'

const BaseWeightedAveragesReport = require(
  'bfx-report/workers/loc.api/weighted.averages.report'
)

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.RService,
  TYPES.GetDataFromApi,
  TYPES.DAO,
  TYPES.Authenticator,
  TYPES.SyncSchema,
  TYPES.ALLOWED_COLLS
]
class WeightedAveragesReport extends BaseWeightedAveragesReport {
  constructor (
    rService,
    getDataFromApi,
    dao,
    authenticator,
    syncSchema,
    ALLOWED_COLLS
  ) {
    super(
      rService,
      getDataFromApi
    )

    this.dao = dao
    this.authenticator = authenticator
    this.syncSchema = syncSchema
    this.ALLOWED_COLLS = ALLOWED_COLLS

    this.tradesModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.TRADES)

    // Used to switch data fetching from DB for framework mode
    this._isNotCalcTakenFromBfxApi = true
  }

  /**
   * @override
   */
  async _getTrades (args) {
    const user = await this.authenticator
      .verifyRequestUser({ auth: args?.auth ?? {} })

    const start = args?.start ?? 0
    const end = args?.end ?? Date.now()
    const symbFilter = args?.symbol?.length > 0
      ? { $in: { symbol: args.symbol } }
      : {}

    const res = await this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.TRADES,
      {
        filter: {
          user_id: user._id,
          $lte: { mtsCreate: end },
          $gte: { mtsCreate: start },
          ...symbFilter
        },
        sort: [['mtsCreate', -1]],
        projection: this.tradesModel,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
    )

    // Returns `nextPage: false` to have the same response as in hosted ver
    return {
      res,
      nextPage: false
    }
  }
}

decorateInjectable(WeightedAveragesReport, depsTypes)

module.exports = WeightedAveragesReport
