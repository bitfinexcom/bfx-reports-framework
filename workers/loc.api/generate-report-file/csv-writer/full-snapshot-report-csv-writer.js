'use strict'

const {
  write
} = require('bfx-report/workers/loc.api/queue/write-data-to-stream/helpers')
const {
  streamWriter
} = require('bfx-report/workers/loc.api/generate-report-file/csv-writer/helpers')
const {
  omitExtraParamFieldsForReportExport
} = require('bfx-report/workers/loc.api/generate-report-file/helpers')

module.exports = (
  rService,
  getDataFromApi
) => async (
  wStream,
  jobData
) => {
  const queue = rService.ctx.lokue_aggregator.q
  const {
    args,
    columnsCsv,
    formatSettings,
    name
  } = jobData ?? {}
  const params = {
    end: Date.now(),
    ...args?.params
  }

  queue.emit('progress', 0)

  if (typeof jobData === 'string') {
    await streamWriter(
      wStream,
      [{
        columnParams: { columns: ['mess'] },
        writeFn: (stream) => write([{ mess: jobData }], stream)
      }]
    )

    queue.emit('progress', 100)

    return
  }

  const res = await getDataFromApi({
    getData: rService[name].bind(rService),
    args: {
      ...args,
      params: omitExtraParamFieldsForReportExport(params)
    },
    callerName: 'REPORT_FILE_WRITER',
    shouldNotInterrupt: true
  })

  const {
    timestamps,
    positionsSnapshot,
    walletsSnapshot,
    positionsTickers,
    walletsTickers,
    positionsTotalPlUsd,
    walletsTotalBalanceUsd
  } = res ?? {}

  wStream.setMaxListeners(50)

  await streamWriter(
    wStream,
    [
      {
        columnParams: {
          header: true,
          columns: columnsCsv.timestamps
        },
        writeFn: (stream) => write(
          [timestamps, {}],
          stream,
          formatSettings.timestamps,
          params
        )
      },
      {
        columnParams: { columns: ['name'] },
        writeFn: (stream) => write([{ name: 'POSITIONS' }], stream)
      },
      {
        columnParams: {
          header: true,
          columns: columnsCsv.positionsSnapshot
        },
        writeFn: (stream) => write(
          [...positionsSnapshot, {}],
          stream,
          formatSettings.positionsSnapshot,
          params
        )
      },
      {
        columnParams: {
          header: true,
          columns: columnsCsv.positionsTotalPlUsd
        },
        writeFn: (stream) => write(
          [{ positionsTotalPlUsd }, {}],
          stream,
          formatSettings.positionsTotalPlUsd,
          params
        )
      },
      {
        columnParams: { columns: ['name'] },
        writeFn: (stream) => write([{ name: 'WALLETS' }], stream)
      },
      {
        columnParams: {
          header: true,
          columns: columnsCsv.walletsSnapshot
        },
        writeFn: (stream) => write(
          [...walletsSnapshot, {}],
          stream,
          formatSettings.walletsSnapshot,
          params
        )
      },
      {
        columnParams: {
          header: true,
          columns: columnsCsv.walletsTotalBalanceUsd
        },
        writeFn: (stream) => write(
          [{ walletsTotalBalanceUsd }, {}],
          stream,
          formatSettings.walletsTotalBalanceUsd,
          params
        )
      },
      {
        columnParams: { columns: ['name'] },
        writeFn: (stream) => write([{ name: 'POSITIONS TICKERS' }], stream)
      },
      {
        columnParams: {
          header: true,
          columns: columnsCsv.positionsTickers
        },
        writeFn: (stream) => write(
          [...positionsTickers, {}],
          stream,
          formatSettings.positionsTickers,
          params
        )
      },
      {
        columnParams: { columns: ['name'] },
        writeFn: (stream) => write([{ name: 'WALLETS TICKERS' }], stream)
      },
      {
        columnParams: {
          header: true,
          columns: columnsCsv.walletsTickers
        },
        writeFn: (stream) => write(
          walletsTickers,
          stream,
          formatSettings.walletsTickers,
          params
        )
      }
    ]
  )

  queue.emit('progress', 100)
}
