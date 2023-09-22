'use strict'

const BaseBfxApiRouter = require(
  'bfx-report/workers/loc.api/bfx.api.router'
)

const RateLimitChecker = require('./rate.limit.checker')

const { decorateInjectable } = require('../di/utils')

const isTestEnv = process.env.NODE_ENV === 'test'

const rateLimitCheckerMaps = new Map()

class BfxApiRouter extends BaseBfxApiRouter {
  constructor () {
    super()

    this._coolDownDelayMs = isTestEnv
      ? 0
      : 60000

    this._rateLimitForMethodName = new Map([
      ['generateToken', null],
      ['invalidateAuthToken', null],
      ['userInfo', 90],
      ['symbols', 90],
      ['futures', 90],
      ['currencies', 90],
      ['inactiveSymbols', 90],
      ['conf', 90],
      ['positionsSnapshot', 90],
      ['getSettings', 90],
      ['updateSettings', 90],
      ['tickersHistory', 30],
      ['positionsHistory', 90],
      ['positions', 90],
      ['positionsAudit', 90],
      ['wallets', 90],
      ['ledgers', 90],
      ['payInvoiceList', 90],
      ['accountTrades', 90],
      ['fundingTrades', 90],
      ['trades', 15],
      ['statusMessages', 90],
      ['candles', 30],
      ['orderTrades', 90],
      ['orderHistory', 90],
      ['activeOrders', 90],
      ['movements', 90],
      ['movementInfo', 90],
      ['fundingOfferHistory', 90],
      ['fundingLoanHistory', 90],
      ['fundingCreditHistory', 90],
      ['accountSummary', 90],
      ['logins', 90],
      ['changeLogs', 90],
      ['status', 30]
    ])
  }

  /**
   * @override
   */
  route (methodName, method) {
    if (
      !methodName ||
      methodName.startsWith('_')
    ) {
      return method()
    }

    if (!rateLimitCheckerMaps.has(methodName)) {
      const rateLimit = this._rateLimitForMethodName.get(methodName)

      rateLimitCheckerMaps.set(
        methodName,
        new RateLimitChecker({ rateLimit })
      )
    }

    const rateLimitChecker = rateLimitCheckerMaps.get(methodName)

    if (rateLimitChecker.check()) {
      // Cool down delay
      return new Promise((resolve) => (
        setTimeout(resolve, this._coolDownDelayMs))
      ).then(() => {
        rateLimitChecker.add()

        return method()
      })
    }

    rateLimitChecker.add()

    return method()
  }
}

decorateInjectable(BfxApiRouter)

module.exports = BfxApiRouter
