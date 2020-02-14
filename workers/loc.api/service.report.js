'use strict'

const BaseReportService = require(
  'bfx-report/workers/loc.api/service.report'
)

class ReportService extends BaseReportService {
  _getTickersHistory (args) {
    return super.getTickersHistory(null, args)
  }

  _getPositionsHistory (args) {
    return super.getPositionsHistory(null, args)
  }

  _getLedgers (args) {
    return super.getLedgers(null, args)
  }

  _getTrades (args) {
    return super.getTrades(null, args)
  }

  _getFundingTrades (args) {
    return super.getFundingTrades(null, args)
  }

  _getPublicTrades (args) {
    return super.getPublicTrades(null, args)
  }

  _getStatusMessages (args) {
    return super.getStatusMessages(null, args)
  }

  _getOrders (args) {
    return super.getOrders(null, args)
  }

  _getMovements (args) {
    return super.getMovements(null, args)
  }

  _getFundingOfferHistory (args) {
    return super.getFundingOfferHistory(null, args)
  }

  _getFundingLoanHistory (args) {
    return super.getFundingLoanHistory(null, args)
  }

  _getFundingCreditHistory (args) {
    return super.getFundingCreditHistory(null, args)
  }

  _getLogins (args) {
    return super.getLogins(null, args)
  }

  _getCandles (args) {
    return super.getCandles(null, args)
  }
}

module.exports = ReportService
