'use strict'

const { omit } = require('lib-js-util-base')

const BaseReportFileJobData = require(
  'bfx-report/workers/loc.api/generate-report-file/report.file.job.data'
)
const {
  getReportFileArgs,
  checkJobAndGetUserData
} = require('bfx-report/workers/loc.api/helpers')

const {
  checkParams,
  getDateString
} = require('../helpers')
const TEMPLATE_FILE_NAMES = require('./pdf-writer/template-file-names')

const { decorateInjectable } = require('../di/utils')

const depsTypes = (TYPES) => [
  TYPES.RService,
  TYPES.DataValidator,
  TYPES.FullSnapshotReportCsvWriter,
  TYPES.FullTaxReportCsvWriter,
  TYPES.WeightedAveragesReportCsvWriter,
  TYPES.TransactionTaxReportCsvWriter
]
class ReportFileJobData extends BaseReportFileJobData {
  constructor (
    rService,
    dataValidator,
    fullSnapshotReportCsvWriter,
    fullTaxReportCsvWriter,
    weightedAveragesReportCsvWriter,
    transactionTaxReportCsvWriter
  ) {
    super(rService, dataValidator)

    this.fullSnapshotReportCsvWriter = fullSnapshotReportCsvWriter
    this.fullTaxReportCsvWriter = fullTaxReportCsvWriter
    this.weightedAveragesReportCsvWriter = weightedAveragesReportCsvWriter
    this.transactionTaxReportCsvWriter = transactionTaxReportCsvWriter
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

  async getMovementsFileJobData (
    args,
    uId,
    uInfo
  ) {
    const _jobData = await super.getMovementsFileJobData(
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

  async getLedgersFileJobData (
    args,
    uId,
    uInfo
  ) {
    const _jobData = await super.getLedgersFileJobData(
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
          },
          balance: {
            balanceUsd: 'BALANCE USD'
          }
        }
      )
    }

    return jobData
  }

  async getWalletsFileJobData (
    args,
    uId,
    uInfo
  ) {
    const _jobData = await super.getWalletsFileJobData(
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

  async getBalanceHistoryFileJobData (
    args,
    uId,
    uInfo
  ) {
    this.dataValidator.validate(
      args,
      this.dataValidator.SCHEMA_IDS.GET_BALANCE_HISTORY_FILE_REQ
    )

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      uId,
      uInfo
    )

    const reportFileArgs = getReportFileArgs(args)

    const jobData = {
      userInfo,
      userId,
      name: 'getBalanceHistory',
      fileNamesMap: [['getBalanceHistory', 'balance-history']],
      args: reportFileArgs,
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

  async getWinLossFileJobData (
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForWinLossFile')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      uId,
      uInfo
    )

    const reportFileArgs = getReportFileArgs(args)

    const jobData = {
      userInfo,
      userId,
      name: 'getWinLoss',
      fileNamesMap: [['getWinLoss', 'win-loss']],
      args: reportFileArgs,
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

  async getPositionsSnapshotFileJobData (
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForPositionsSnapshotFile')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      uId,
      uInfo
    )

    const reportFileArgs = getReportFileArgs(args)

    const jobData = {
      userInfo,
      userId,
      name: 'getPositionsSnapshot',
      fileNamesMap: [['getPositionsSnapshot', 'positions-snapshot']],
      args: reportFileArgs,
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

  async getFullSnapshotReportFileJobData (
    args,
    uId,
    uInfo,
    opts
  ) {
    checkParams(args, 'paramsSchemaForFullSnapshotReportFile')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      uId,
      uInfo
    )
    const { params } = { ...args }
    const { username } = { ...uInfo }

    const {
      end,
      isStartSnapshot,
      isEndSnapshot
    } = { ...params }
    const {
      isFullTaxReport,
      chunkCommonFolder: _chunkCommonFolder
    } = { ...opts }
    const _typeName = isStartSnapshot
      ? 'START_SNAPSHOT'
      : 'END_SNAPSHOT'
    const typeName = (isStartSnapshot || isEndSnapshot)
      ? _typeName
      : 'MOMENT'
    const fileName = isFullTaxReport
      ? `full-tax-report_${typeName}`
      : `full-snapshot-report_${typeName}`

    const endDate = end
      ? getDateString(end)
      : getDateString()
    const uName = username ? `${username}_` : ''
    const chunkCommonFolder = (
      _chunkCommonFolder &&
      typeof _chunkCommonFolder === 'string'
    )
      ? _chunkCommonFolder
      : `${uName}full-snapshot-report_TO_${endDate}`

    const reportFileArgs = getReportFileArgs(
      args,
      null,
      { isBaseNameInName: true }
    )

    const jobData = {
      chunkCommonFolder,
      userInfo,
      userId,
      name: 'getFullSnapshotReport',
      fileNamesMap: [['getFullSnapshotReport', fileName]],
      args: reportFileArgs,
      columnsCsv: {
        timestamps: {
          mtsCreated: 'CREATED',
          end: 'SNAPSHOT AT'
        },
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
        positionsTickers: {
          symbol: 'PAIR',
          amount: 'AMOUNT'
        },
        walletsTickers: {
          walletType: 'WALLET TYPE',
          symbol: 'PAIR',
          amount: 'AMOUNT'
        },
        positionsTotalPlUsd: {
          positionsTotalPlUsd: 'POSITIONS TOTAL P/L USD'
        },
        walletsTotalBalanceUsd: {
          walletsTotalBalanceUsd: 'WALLETS TOTAL BALANCE USD'
        }
      },
      formatSettings: {
        timestamps: {
          mtsCreated: 'date',
          end: 'date'
        },
        positionsSnapshot: {
          mtsUpdate: 'date',
          mtsCreate: 'date',
          symbol: 'symbol'
        },
        walletsSnapshot: {
          mtsUpdate: 'date',
          currency: 'symbol'
        },
        positionsTickers: {
          symbol: 'symbol'
        },
        walletsTickers: {
          symbol: 'symbol'
        }
      },
      csvCustomWriter: this.fullSnapshotReportCsvWriter,
      pdfCustomTemplateName: TEMPLATE_FILE_NAMES.FULL_SNAPSHOT_REPORT
    }

    return jobData
  }

  async getFullTaxReportFileJobData (
    args,
    uId,
    uInfo
  ) {
    const { params } = { ...args }
    const {
      start,
      end,
      isStartSnapshot,
      isEndSnapshot
    } = { ...params }
    const { username } = { ...uInfo }

    const uName = username ? `${username}_` : ''
    const startDate = start
      ? getDateString(start)
      : getDateString(0)
    const endDate = end
      ? getDateString(end)
      : getDateString()
    const chunkCommonFolder = `${uName}full-tax-report_FROM_${startDate}_TO_${endDate}`

    if (isStartSnapshot || isEndSnapshot) {
      const mts = isStartSnapshot ? start : end

      return this.getFullSnapshotReportFileJobData(
        {
          ...args,
          params: {
            ...omit(params, ['start']),
            end: mts
          }
        },
        uId,
        uInfo,
        {
          chunkCommonFolder,
          isFullTaxReport: true
        }
      )
    }

    checkParams(args, 'paramsSchemaForFullTaxReportFile')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      uId,
      uInfo
    )

    const reportFileArgs = getReportFileArgs(
      args,
      null,
      { isBaseNameInName: true }
    )

    const jobData = {
      chunkCommonFolder,
      userInfo,
      userId,
      name: 'getFullTaxReport',
      fileNamesMap: [['getFullTaxReport', 'full-tax-report_FULL_PERIOD']],
      args: reportFileArgs,
      /*
       * Example how to overwrite column order for pdf
       * columnsPdf: {},
       */
      columnsCsv: {
        timestamps: {
          mtsCreated: 'CREATED',
          start: 'FROM',
          end: 'TO'
        },
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
        movements: {
          id: '#',
          mtsUpdated: 'DATE',
          currency: 'CURRENCY',
          status: 'STATUS',
          amount: 'AMOUNT',
          fees: 'FEES',
          destinationAddress: 'DESCRIPTION',
          transactionId: 'TRANSACTION ID',
          note: 'NOTE'
        },
        periodBalances: {
          walletsTotalBalanceUsd: 'WALLETS TOTAL BALANCE USD',
          positionsTotalPlUsd: 'POSITIONS TOTAL P/L USD',
          totalResult: 'TOTAL RESULT USD'
        },
        movementsTotalAmount: {
          movementsTotalAmount: 'MOVEMENTS TOTAL AMOUNT USD'
        },
        totalResult: {
          totalResult: 'TOTAL RESULT USD'
        }
      },
      formatSettings: {
        timestamps: {
          mtsCreated: 'date',
          start: 'date',
          end: 'date'
        },
        startingPositionsSnapshot: {
          mtsUpdate: 'date',
          mtsCreate: 'date',
          symbol: 'symbol'
        },
        endingPositionsSnapshot: {
          mtsUpdate: 'date',
          mtsCreate: 'date',
          symbol: 'symbol'
        },
        finalState: {
          movements: {
            mtsUpdated: 'date'
          }
        }
      },
      csvCustomWriter: this.fullTaxReportCsvWriter,
      pdfCustomTemplateName: TEMPLATE_FILE_NAMES.FULL_TAX_REPORT
    }

    return jobData
  }

  async getTransactionTaxReportFileJobData (
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForTransactionTaxReportFile')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      uId,
      uInfo
    )

    const reportFileArgs = getReportFileArgs(args)

    const jobData = {
      userInfo,
      userId,
      name: 'getTransactionTaxReport',
      fileNamesMap: [['getTransactionTaxReport', 'transaction-tax-report']],
      args: reportFileArgs,
      propNameForPagination: null,
      columnsCsv: {
        taxes: {
          asset: 'CURRENCY',
          type: 'SOURCE',
          amount: 'AMOUNT',
          mtsAcquired: 'DATE ACQUIRED',
          mtsSold: 'DATE SOLD',
          proceeds: 'PROCEEDS',
          cost: 'COST',
          gainOrLoss: 'GAIN OR LOSS'
        }
      },
      formatSettings: {
        taxes: {
          asset: 'symbol',
          type: 'lowerCaseWithUpperFirst',
          mtsAcquired: 'date',
          mtsSold: 'date'
        }
      },
      csvCustomWriter: this.transactionTaxReportCsvWriter,
      pdfCustomTemplateName: TEMPLATE_FILE_NAMES.TRANSACTION_TAX_REPORT
    }

    return jobData
  }

  async getTradedVolumeFileJobData (
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForTradedVolumeFile')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      uId,
      uInfo
    )

    const reportFileArgs = getReportFileArgs(args)

    const jobData = {
      userInfo,
      userId,
      name: 'getTradedVolume',
      fileNamesMap: [['getTradedVolume', 'traded-volume']],
      args: reportFileArgs,
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

  async getTotalFeesReportFileJobData (
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForTotalFeesReportFile')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      uId,
      uInfo
    )

    const reportFileArgs = getReportFileArgs(args)

    const jobData = {
      userInfo,
      userId,
      name: 'getTotalFeesReport',
      fileNamesMap: [['getTotalFeesReport', 'total-fees-report']],
      args: reportFileArgs,
      propNameForPagination: null,
      columnsCsv: {
        USD: 'USD',
        cumulative: 'CUMULATIVE USD',
        mts: 'DATE'
      },
      formatSettings: {
        mts: 'date'
      }
    }

    return jobData
  }

  async getPerformingLoanFileJobData (
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForPerformingLoanFile')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      uId,
      uInfo
    )

    const reportFileArgs = getReportFileArgs(args)

    const jobData = {
      userInfo,
      userId,
      name: 'getPerformingLoan',
      fileNamesMap: [['getPerformingLoan', 'performing-loan']],
      args: reportFileArgs,
      propNameForPagination: null,
      columnsCsv: {
        USD: 'USD',
        cumulative: 'CUMULATIVE USD',
        perc: 'PERCENT FOR YEAR',
        mts: 'DATE'
      },
      formatSettings: {
        mts: 'date'
      }
    }

    return jobData
  }

  async getWinLossVSAccountBalanceFileJobData (
    args,
    uId,
    uInfo
  ) {
    checkParams(args, 'paramsSchemaForWinLossVSAccountBalanceFile')

    const {
      userId,
      userInfo
    } = await checkJobAndGetUserData(
      this.rService,
      uId,
      uInfo
    )

    const reportFileArgs = getReportFileArgs(args)
    const suffix = args?.params?.isVSPrevDayBalance
      ? 'balance'
      : 'deposits'

    const jobData = {
      userInfo,
      userId,
      name: 'getWinLossVSAccountBalance',
      fileNamesMap: [[
        'getWinLossVSAccountBalance',
        `win-loss-percentage-gains-vs-${suffix}`
      ]],
      args: reportFileArgs,
      propNameForPagination: null,
      columnsCsv: {
        perc: 'PERCENT',
        mts: 'DATE'
      },
      formatSettings: {
        mts: 'date'
      }
    }

    return jobData
  }
}

decorateInjectable(ReportFileJobData, depsTypes)

module.exports = ReportFileJobData
