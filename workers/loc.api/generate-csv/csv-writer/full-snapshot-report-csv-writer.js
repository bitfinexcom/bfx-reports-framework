'use strict'

const { pipeline } = require('stream')
const { stringify } = require('csv')

const {
  write
} = require('bfx-report/workers/loc.api/queue/write-data-to-stream/helpers')

const nope = () => {}

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
    const stringifier = stringify(
      { columns: ['mess'] }
    )

    pipeline(stringifier, wStream, nope)
    write([{ mess: jobData }], stringifier)
    queue.emit('progress', 100)
    stringifier.end()

    return
  }

  wStream.setMaxListeners(50)

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

  const rStreamArr = [
    timestampsStringifier,
    posNameStringifier,
    posStringifier,
    positionsTotalPlUsdStringifier,
    walletsNameStringifier,
    walletsStringifier,
    walletsTotalBalanceUsdStringifier,
    positionsTickersNameStringifier,
    positionsTickersStringifier,
    walletsTickersNameStringifier,
    walletsTickersStringifier
  ]

  rStreamArr.forEach((rStream) => {
    pipeline(rStream, wStream, nope)
  })

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
