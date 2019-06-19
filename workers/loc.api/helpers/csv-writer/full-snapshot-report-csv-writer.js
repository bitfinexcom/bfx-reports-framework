'use strict'

const { promisify } = require('util')
const { stringify } = require('csv')

const {
  write,
  getDataFromApi
} = require('bfx-report/workers/loc.api/queue/helpers')

module.exports = async (
  rService,
  wStream,
  jobData
) => {
  const queue = rService.ctx.lokue_aggregator.q
  const {
    args: _args,
    columnsCsv,
    formatSettings
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

  posNameStringifier.pipe(wStream)
  posStringifier.pipe(wStream)
  walletsNameStringifier.pipe(wStream)
  walletsStringifier.pipe(wStream)

  const getData = promisify(rService.getFullSnapshotReport.bind(rService))
  const res = await getDataFromApi(
    getData,
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
    res.walletsSnapshot,
    walletsStringifier,
    formatSettings.walletsSnapshot,
    params
  )

  queue.emit('progress', 100)

  posNameStringifier.end()
  posStringifier.end()
  walletsNameStringifier.end()
  walletsStringifier.end()
}
