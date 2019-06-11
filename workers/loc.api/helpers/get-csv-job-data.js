'use strict'

const {
  getCsvArgs,
  checkJobAndGetUserData
} = require('bfx-report/workers/loc.api/helpers')

const checkParams = require('./check-params')
const { accountSnapshotCsvWriter } = require('./csv-writer')

const getCsvJobData = {
  async getRiskCsvJobData (
    reportService,
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForRiskCsv')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      reportService,
      args,
      uId,
      uInfo
    )

    const csvArgs = getCsvArgs(args)

    const jobData = {
      userInfo,
      userId,
      name: 'getRisk',
      fileNamesMap: [['getRisk', 'risk']],
      args: csvArgs,
      propNameForPagination: null,
      columnsCsv: {
        USD: 'USD',
        EUR: 'EUR',
        GBP: 'GBP',
        JPY: 'JPY',
        mts: 'DATE'
      },
      formatSettings: {
        mts: 'date'
      }
    }

    return jobData
  },
  async getBalanceHistoryCsvJobData (
    reportService,
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForBalanceHistoryCsv')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      reportService,
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
        EUR: 'EUR',
        GBP: 'GBP',
        JPY: 'JPY',
        mts: 'DATE'
      },
      formatSettings: {
        mts: 'date'
      }
    }

    return jobData
  },
  async getWinLossCsvJobData (
    reportService,
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForWinLossCsv')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      reportService,
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
        EUR: 'EUR',
        GBP: 'GBP',
        JPY: 'JPY',
        mts: 'DATE'
      },
      formatSettings: {
        mts: 'date'
      }
    }

    return jobData
  },
  async getAccountSnapshotCsvJobData (
    reportService,
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForgetAccountSnapshotCsv')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      reportService,
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
      name: 'getAccountSnapshot',
      fileNamesMap: [['getAccountSnapshot', 'account-snapshot']],
      args: csvArgs,
      columnsCsv: {
        positionsSnapshot: {
          id: '#',
          symbol: 'PAIR',
          amount: 'AMOUNT',
          basePrice: 'BASE PRICE',
          actualPrice: 'ACTUAL PRICE',
          pl: 'P/L',
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
        }
      },
      formatSettings: {
        positionsSnapshot: {
          mtsUpdate: 'date'
        },
        walletsSnapshot: {
          mtsUpdate: 'date',
          currency: 'symbol'
        }
      },
      csvCustomWriter: accountSnapshotCsvWriter
    }

    return jobData
  }
}

module.exports = getCsvJobData
