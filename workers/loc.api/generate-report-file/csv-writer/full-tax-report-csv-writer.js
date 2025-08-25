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
  } = { ...jobData }
  const params = {
    start: 0,
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
    startingPositionsSnapshot,
    endingPositionsSnapshot,
    finalState: {
      startingPeriodBalances,
      movements,
      movementsTotalAmount,
      endingPeriodBalances,
      totalResult
    }
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
        writeFn: (stream) => write(
          [{ name: 'STARTING POSITIONS SNAPSHOT' }],
          stream
        )
      },
      {
        columnParams: {
          header: true,
          columns: columnsCsv.positionsSnapshot
        },
        writeFn: (stream) => write(
          [...startingPositionsSnapshot, {}],
          stream,
          formatSettings.startingPositionsSnapshot,
          params
        )
      },
      {
        columnParams: { columns: ['name'] },
        writeFn: (stream) => write(
          [{ name: 'ENDING POSITIONS SNAPSHOT' }],
          stream
        )
      },
      {
        columnParams: {
          header: true,
          columns: columnsCsv.positionsSnapshot
        },
        writeFn: (stream) => write(
          [...endingPositionsSnapshot, {}],
          stream,
          formatSettings.endingPositionsSnapshot,
          params
        )
      },
      {
        columnParams: { columns: ['name'] },
        writeFn: (stream) => write(
          [{ name: 'FINAL STATE' }],
          stream
        )
      },
      {
        columnParams: { columns: ['name'] },
        writeFn: (stream) => write(
          [{ name: 'STARTING PERIOD BALANCES' }],
          stream
        )
      },
      {
        columnParams: {
          header: true,
          columns: columnsCsv.periodBalances
        },
        writeFn: (stream) => write(
          [startingPeriodBalances, {}],
          stream
        )
      },
      {
        columnParams: { columns: ['name'] },
        writeFn: (stream) => write(
          [{ name: 'MOVEMENTS DETAIL' }],
          stream
        )
      },
      {
        columnParams: {
          header: true,
          columns: columnsCsv.movements
        },
        writeFn: (stream) => write(
          [...movements, {}],
          stream,
          formatSettings.finalState.movements,
          params
        )
      },
      {
        columnParams: {
          header: true,
          columns: columnsCsv.movementsTotalAmount
        },
        writeFn: (stream) => write(
          [{ movementsTotalAmount }, {}],
          stream
        )
      },
      {
        columnParams: { columns: ['name'] },
        writeFn: (stream) => write(
          [{ name: 'ENDING PERIOD BALANCES' }],
          stream
        )
      },
      {
        columnParams: {
          header: true,
          columns: columnsCsv.periodBalances
        },
        writeFn: (stream) => write(
          [endingPeriodBalances, {}],
          stream
        )
      },
      {
        columnParams: {
          header: true,
          columns: columnsCsv.totalResult
        },
        writeFn: (stream) => write(
          [{ totalResult }],
          stream
        )
      }
    ]
  )

  queue.emit('progress', 100)
}
