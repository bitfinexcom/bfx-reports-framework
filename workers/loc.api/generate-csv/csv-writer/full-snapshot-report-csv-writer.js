'use strict'

const {
  write
} = require('bfx-report/workers/loc.api/queue/write-data-to-stream/helpers')

const { streamWriter } = require('./helpers')

module.exports = (
  rService,
  getDataFromApi
) => async (
  wStream,
  jobData
) => {
  const queue = rService.ctx.lokue_aggregator.q
  const {
    args: _args,
    columnsCsv,
    formatSettings,
    name
  } = { ...jobData }
  const { params: _params } = { ..._args }
  const params = {
    end: Date.now(),
    ..._params
  }
  const args = { ..._args, params }
  const { end } = params
  const mtsCreated = Date.now()

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
    args,
    callerName: 'CSV_WRITER'
  })

  const {
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
          [{ mtsCreated, end }, {}],
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
          [{ plUsd: positionsTotalPlUsd }, {}],
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
          [{ balanceUsd: walletsTotalBalanceUsd }, {}],
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
