'use strict'

const {
  decorate,
  inject
} = require('inversify')
const BaseCsvJobData = require(
  'bfx-report/workers/loc.api/generate-csv/csv.job.data'
)
const {
  getCsvArgs,
  checkJobAndGetUserData
} = require('bfx-report/workers/loc.api/helpers')

const TYPES = require('../di/types')

const {
  checkParams
} = require('../helpers')

class CsvJobData extends BaseCsvJobData {
  constructor (
    rService,
    fullSnapshotReportCsvWriter
  ) {
    super(rService)

    this.fullSnapshotReportCsvWriter = fullSnapshotReportCsvWriter
  }

  _addColumnsBySchema (columnsCsv = {}, schema = {}) {
    return Object.entries({ ...columnsCsv })
      .reduce((accum, [key, val]) => {
        return {
          ...accum,
          [key]: val,
          ...(schema[key] && typeof schema[key] === 'object')
            ? schema[key]
            : {}
        }
      }, {})
  }

  async getMovementsCsvJobData (
    args,
    uId,
    uInfo
  ) {
    const _jobData = await super.getMovementsCsvJobData(
      args,
      uId,
      uInfo
    )

    const jobData = {
      ..._jobData,
      columnsCsv: this._addColumnsBySchema(
        _jobData.columnsCsv,
        {
          amount: {
            amountUsd: 'AMOUNT USD'
          }
        }
      )
    }

    return jobData
  }

  async getWalletsCsvJobData (
    args,
    uId,
    uInfo
  ) {
    const _jobData = await super.getWalletsCsvJobData(
      args,
      uId,
      uInfo
    )

    const jobData = {
      ..._jobData,
      columnsCsv: {
        ..._jobData.columnsCsv,
        balanceUsd: 'BALANCE USD'
      }
    }

    return jobData
  }

  async getBalanceHistoryCsvJobData (
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForBalanceHistoryCsv')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      args,
      uId,
      uInfo
    )

    const csvArgs = getCsvArgs(args)

    const jobData = {
      userInfo,
      userId,
      name: 'getBalanceHistory',
      fileNamesMap: [['getBalanceHistory', 'balance-history']],
      args: csvArgs,
      propNameForPagination: null,
      columnsCsv: {
        USD: 'USD',
        mts: 'DATE'
      },
      formatSettings: {
        mts: 'date'
      }
    }

    return jobData
  }

  async getWinLossCsvJobData (
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForWinLossCsv')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      args,
      uId,
      uInfo
    )

    const csvArgs = getCsvArgs(args)

    const jobData = {
      userInfo,
      userId,
      name: 'getWinLoss',
      fileNamesMap: [['getWinLoss', 'win-loss']],
      args: csvArgs,
      propNameForPagination: null,
      columnsCsv: {
        USD: 'USD',
        mts: 'DATE'
      },
      formatSettings: {
        mts: 'date'
      }
    }

    return jobData
  }

  async getPositionsSnapshotCsvJobData (
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForPositionsSnapshotCsv')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      args,
      uId,
      uInfo
    )

    const csvArgs = getCsvArgs(args)

    const jobData = {
      userInfo,
      userId,
      name: 'getPositionsSnapshot',
      fileNamesMap: [['getPositionsSnapshot', 'positions-snapshot']],
      args: csvArgs,
      propNameForPagination: null,
      columnsCsv: {
        id: '#',
        symbol: 'PAIR',
        amount: 'AMOUNT',
        basePrice: 'BASE PRICE',
        actualPrice: 'ACTUAL PRICE',
        pl: 'P/L',
        plUsd: 'P/L USD',
        plPerc: 'P/L%',
        marginFunding: 'FUNDING COST',
        marginFundingType: 'FUNDING TYPE',
        status: 'STATUS',
        mtsUpdate: 'UPDATED',
        mtsCreate: 'CREATED'
      },
      formatSettings: {
        mtsUpdate: 'date',
        mtsCreate: 'date',
        symbol: 'symbol'
      }
    }

    return jobData
  }

  async getFullSnapshotReportCsvJobData (
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForFullSnapshotReportCsv')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      args,
      uId,
      uInfo
    )

    const csvArgs = getCsvArgs(
      args,
      null,
      { isOnMomentInName: true }
    )

    const jobData = {
      userInfo,
      userId,
      name: 'getFullSnapshotReport',
      fileNamesMap: [['getFullSnapshotReport', 'full-snapshot-report']],
      args: csvArgs,
      columnsCsv: {
        positionsSnapshot: {
          id: '#',
          symbol: 'PAIR',
          amount: 'AMOUNT',
          basePrice: 'BASE PRICE',
          actualPrice: 'ACTUAL PRICE',
          pl: 'P/L',
          plUsd: 'P/L USD',
          plPerc: 'P/L%',
          marginFunding: 'FUNDING COST',
          marginFundingType: 'FUNDING TYPE',
          status: 'STATUS',
          mtsUpdate: 'UPDATED',
          mtsCreate: 'CREATED'
        },
        walletsSnapshot: {
          type: 'TYPE',
          currency: 'CURRENCY',
          balance: 'BALANCE',
          balanceUsd: 'BALANCE USD'
        },
        tickers: {
          symbol: 'PAIR',
          amount: 'AMOUNT'
        }
      },
      formatSettings: {
        positionsSnapshot: {
          mtsUpdate: 'date',
          mtsCreate: 'date',
          symbol: 'symbol'
        },
        walletsSnapshot: {
          mtsUpdate: 'date',
          currency: 'symbol'
        },
        tickers: {
          symbol: 'symbol'
        }
      },
      csvCustomWriter: this.fullSnapshotReportCsvWriter
    }

    return jobData
  }
}

decorate(inject(TYPES.RService), CsvJobData, 0)
decorate(inject(TYPES.FullSnapshotReportCsvWriter), CsvJobData, 1)

module.exports = CsvJobData
