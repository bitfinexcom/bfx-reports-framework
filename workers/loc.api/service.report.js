'use strict'

const BaseReportService = require(
  'bfx-report/workers/loc.api/service.report'
)

const SYNC_API_METHODS = require('./sync/schema/sync.api.methods')

class ReportService extends BaseReportService {
  [SYNC_API_METHODS.TICKERS_HISTORY] (args) {
    return super.getTickersHistory(null, args)
  }

  [SYNC_API_METHODS.POSITIONS_HISTORY] (args) {
    return super.getPositionsHistory(null, args)
  }

  [SYNC_API_METHODS.LEDGERS] (args) {
    return super.getLedgers(null, args)
  }

  [SYNC_API_METHODS.PAY_INVOICE_LIST] (args) {
    return super.getPayInvoiceList(null, args)
  }

  [SYNC_API_METHODS.TRADES] (args) {
    return super.getTrades(null, args)
  }

  [SYNC_API_METHODS.FUNDING_TRADES] (args) {
    return super.getFundingTrades(null, args)
  }

  [SYNC_API_METHODS.PUBLIC_TRADES] (args) {
    return super.getPublicTrades(null, args)
  }

  [SYNC_API_METHODS.STATUS_MESSAGES] (args) {
    return super.getStatusMessages(null, args)
  }

  [SYNC_API_METHODS.ORDERS] (args) {
    return super.getOrders(null, args)
  }

  [SYNC_API_METHODS.MOVEMENTS] (args) {
    return super.getMovements(null, args)
  }

  [SYNC_API_METHODS.FUNDING_OFFER_HISTORY] (args) {
    return super.getFundingOfferHistory(null, args)
  }

  [SYNC_API_METHODS.FUNDING_LOAN_HISTORY] (args) {
    return super.getFundingLoanHistory(null, args)
  }

  [SYNC_API_METHODS.FUNDING_CREDIT_HISTORY] (args) {
    return super.getFundingCreditHistory(null, args)
  }

  [SYNC_API_METHODS.LOGINS] (args) {
    return super.getLogins(null, args)
  }

  [SYNC_API_METHODS.CHANGE_LOGS] (args) {
    return super.getChangeLogs(null, args)
  }

  [SYNC_API_METHODS.CANDLES] (args) {
    return super.getCandles(null, args)
  }

  [SYNC_API_METHODS.POSITIONS_SNAPSHOT] (args) {
    return super.getPositionsSnapshot(null, args)
  }
}

module.exports = ReportService
