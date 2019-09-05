'use strict'

const { stringify } = require('csv')

const {
  write,
  getDataFromApi
} = require('bfx-report/workers/loc.api/queue/write-data-to-stream/helpers')

module.exports = (rService) => async (
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

  queue.emit('progress', 0)

  if (typeof jobData === 'string') {
    const stringifier = stringify(
      { columns: ['mess'] }
    )

    stringifier.pipe(wStream)
    write([{ mess: jobData }], stringifier)
    queue.emit('progress', 100)
    stringifier.end()

    return
  }

  const posNameStringifier = stringify(
    { columns: ['name'] }
  )
  const posStringifier = stringify({
    header: true,
    columns: columnsCsv.positionsSnapshot
  })
  const walletsNameStringifier = stringify(
    { columns: ['name'] }
  )
  const walletsStringifier = stringify({
    header: true,
    columns: columnsCsv.walletsSnapshot
  })
  const positionsTickersNameStringifier = stringify(
    { columns: ['name'] }
  )
  const positionsTickersStringifier = stringify({
    header: true,
    columns: columnsCsv.positionsTickers
  })
  const walletsTickersNameStringifier = stringify(
    { columns: ['name'] }
  )
  const walletsTickersStringifier = stringify({
    header: true,
    columns: columnsCsv.walletsTickers
  })

  posNameStringifier.pipe(wStream)
  posStringifier.pipe(wStream)
  walletsNameStringifier.pipe(wStream)
  walletsStringifier.pipe(wStream)
  positionsTickersNameStringifier.pipe(wStream)
  positionsTickersStringifier.pipe(wStream)
  walletsTickersNameStringifier.pipe(wStream)
  walletsTickersStringifier.pipe(wStream)

  const res = await getDataFromApi(
    rService[name].bind(rService),
    args
  )

  write([{ name: 'POSITIONS' }], posNameStringifier)
  write(
    [...res.positionsSnapshot, {}],
    posStringifier,
    formatSettings.positionsSnapshot,
    params
  )
  write([{ name: 'WALLETS' }], walletsNameStringifier)
  write(
    [...res.walletsSnapshot, {}],
    walletsStringifier,
    formatSettings.walletsSnapshot,
    params
  )
  write([{ name: 'POSITIONS TICKERS' }], positionsTickersNameStringifier)
  write(
    [...res.positionsTickers, {}],
    positionsTickersStringifier,
    formatSettings.positionsTickers,
    params
  )
  write([{ name: 'WALLETS TICKERS' }], walletsTickersNameStringifier)
  write(
    res.walletsTickers,
    walletsTickersStringifier,
    formatSettings.walletsTickers,
    params
  )

  queue.emit('progress', 100)

  posNameStringifier.end()
  posStringifier.end()
  walletsNameStringifier.end()
  walletsStringifier.end()
  positionsTickersNameStringifier.end()
  positionsTickersStringifier.end()
  walletsTickersNameStringifier.end()
  walletsTickersStringifier.end()
}
