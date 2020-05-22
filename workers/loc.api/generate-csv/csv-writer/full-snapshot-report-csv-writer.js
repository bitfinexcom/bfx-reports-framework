'use strict'

const { stringify } = require('csv')

const {
  write
} = require('bfx-report/workers/loc.api/queue/write-data-to-stream/helpers')
const {
  getDataFromApi
} = require('bfx-report/workers/loc.api/helpers')

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
  const { end } = params
  const mtsCreated = Date.now()

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

  wStream.setMaxListeners(20)

  const timestampsStringifier = stringify({
    header: true,
    columns: columnsCsv.timestamps
  })
  const posNameStringifier = stringify(
    { columns: ['name'] }
  )
  const posStringifier = stringify({
    header: true,
    columns: columnsCsv.positionsSnapshot
  })
  const positionsTotalPlUsdStringifier = stringify({
    header: true,
    columns: columnsCsv.positionsTotalPlUsd
  })
  const walletsNameStringifier = stringify(
    { columns: ['name'] }
  )
  const walletsStringifier = stringify({
    header: true,
    columns: columnsCsv.walletsSnapshot
  })
  const walletsTotalBalanceUsdStringifier = stringify({
    header: true,
    columns: columnsCsv.walletsTotalBalanceUsd
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

  timestampsStringifier.pipe(wStream)
  posNameStringifier.pipe(wStream)
  posStringifier.pipe(wStream)
  positionsTotalPlUsdStringifier.pipe(wStream)
  walletsNameStringifier.pipe(wStream)
  walletsStringifier.pipe(wStream)
  walletsTotalBalanceUsdStringifier.pipe(wStream)
  positionsTickersNameStringifier.pipe(wStream)
  positionsTickersStringifier.pipe(wStream)
  walletsTickersNameStringifier.pipe(wStream)
  walletsTickersStringifier.pipe(wStream)

  const res = await getDataFromApi(
    rService[name].bind(rService),
    args
  )

  const {
    positionsSnapshot,
    walletsSnapshot,
    positionsTickers,
    walletsTickers,
    positionsTotalPlUsd,
    walletsTotalBalanceUsd
  } = { ...res }

  write(
    [{ mtsCreated, end }, {}],
    timestampsStringifier,
    formatSettings.timestamps,
    params
  )
  write([{ name: 'POSITIONS' }], posNameStringifier)
  write(
    [...positionsSnapshot, {}],
    posStringifier,
    formatSettings.positionsSnapshot,
    params
  )
  write(
    [{ plUsd: positionsTotalPlUsd }, {}],
    positionsTotalPlUsdStringifier,
    formatSettings.positionsTotalPlUsd,
    params
  )
  write([{ name: 'WALLETS' }], walletsNameStringifier)
  write(
    [...walletsSnapshot, {}],
    walletsStringifier,
    formatSettings.walletsSnapshot,
    params
  )
  write(
    [{ balanceUsd: walletsTotalBalanceUsd }, {}],
    walletsTotalBalanceUsdStringifier,
    formatSettings.walletsTotalBalanceUsd,
    params
  )
  write([{ name: 'POSITIONS TICKERS' }], positionsTickersNameStringifier)
  write(
    [...positionsTickers, {}],
    positionsTickersStringifier,
    formatSettings.positionsTickers,
    params
  )
  write([{ name: 'WALLETS TICKERS' }], walletsTickersNameStringifier)
  write(
    walletsTickers,
    walletsTickersStringifier,
    formatSettings.walletsTickers,
    params
  )

  queue.emit('progress', 100)

  posNameStringifier.end()
  posStringifier.end()
  positionsTotalPlUsdStringifier.end()
  walletsNameStringifier.end()
  walletsStringifier.end()
  walletsTotalBalanceUsdStringifier.end()
  positionsTickersNameStringifier.end()
  positionsTickersStringifier.end()
  walletsTickersNameStringifier.end()
  walletsTickersStringifier.end()
}
