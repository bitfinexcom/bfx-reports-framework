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

  wStream.setMaxListeners(20)

  const winLossTotalAmountStringifier = stringify({
    header: true,
    columns: columnsCsv.winLossTotalAmount
  })
  const startPosNameStringifier = stringify(
    { columns: ['name'] }
  )
  const startPosStringifier = stringify({
    header: true,
    columns: columnsCsv.positionsSnapshot
  })
  const startTickersNameStringifier = stringify(
    { columns: ['name'] }
  )
  const startTickersStringifier = stringify({
    header: true,
    columns: columnsCsv.tickers
  })
  const endPosNameStringifier = stringify(
    { columns: ['name'] }
  )
  const endPosStringifier = stringify({
    header: true,
    columns: columnsCsv.positionsSnapshot
  })
  const endTickersNameStringifier = stringify(
    { columns: ['name'] }
  )
  const endTickersStringifier = stringify({
    header: true,
    columns: columnsCsv.tickers
  })
  const movementsTotalAmountNameStringifier = stringify(
    { columns: ['name'] }
  )
  const movementsTotalAmountStringifier = stringify({
    header: true,
    columns: columnsCsv.movementsTotalAmount
  })
  const movementsNameStringifier = stringify(
    { columns: ['name'] }
  )
  const movementsStringifier = stringify({
    header: true,
    columns: columnsCsv.movements
  })

  winLossTotalAmountStringifier.pipe(wStream)
  startPosNameStringifier.pipe(wStream)
  startPosStringifier.pipe(wStream)
  startTickersNameStringifier.pipe(wStream)
  startTickersStringifier.pipe(wStream)
  endPosNameStringifier.pipe(wStream)
  endPosStringifier.pipe(wStream)
  endTickersNameStringifier.pipe(wStream)
  endTickersStringifier.pipe(wStream)
  movementsTotalAmountNameStringifier.pipe(wStream)
  movementsTotalAmountStringifier.pipe(wStream)
  movementsNameStringifier.pipe(wStream)
  movementsStringifier.pipe(wStream)

  const res = await getDataFromApi(
    rService[name].bind(rService),
    args
  )
  const {
    winLossTotalAmount,
    startPositionsSnapshot,
    startTickers,
    endPositionsSnapshot,
    endTickers,
    depositsTotalAmount,
    withdrawalsTotalAmount,
    movementsTotalAmount,
    movements
  } = { ...res }

  write(
    [{ amount: winLossTotalAmount }, {}],
    winLossTotalAmountStringifier,
    formatSettings.winLossTotalAmount,
    params
  )

  write([{ name: 'START POSITIONS' }], startPosNameStringifier)
  write(
    [...startPositionsSnapshot, {}],
    startPosStringifier,
    formatSettings.positionsSnapshot,
    params
  )
  write([{ name: 'START TICKERS' }], startTickersNameStringifier)
  write(
    [...startTickers, {}],
    startTickersStringifier,
    formatSettings.tickers,
    params
  )
  write([{ name: 'END POSITIONS' }], endPosNameStringifier)
  write(
    [...endPositionsSnapshot, {}],
    endPosStringifier,
    formatSettings.positionsSnapshot,
    params
  )
  write([{ name: 'END TICKERS' }], endTickersNameStringifier)
  write(
    [...endTickers, {}],
    endTickersStringifier,
    formatSettings.tickers,
    params
  )

  write([{ name: 'MOVEMENTS TOTAL AMOUNT' }], movementsTotalAmountNameStringifier)
  write(
    [
      {
        depositsTotalAmount,
        withdrawalsTotalAmount,
        movementsTotalAmount
      },
      {}
    ],
    movementsTotalAmountStringifier,
    formatSettings.movementsTotalAmount,
    params
  )
  write([{ name: 'MOVEMENTS DETAIL' }], movementsNameStringifier)
  write(
    movements,
    movementsStringifier,
    formatSettings.movements,
    params
  )

  queue.emit('progress', 100)

  winLossTotalAmountStringifier.end()
  startPosNameStringifier.end()
  startPosStringifier.end()
  startTickersNameStringifier.end()
  startTickersStringifier.end()
  endPosNameStringifier.end()
  endPosStringifier.end()
  endTickersNameStringifier.end()
  endTickersStringifier.end()
  movementsTotalAmountNameStringifier.end()
  movementsTotalAmountStringifier.end()
  movementsNameStringifier.end()
  movementsStringifier.end()
}
