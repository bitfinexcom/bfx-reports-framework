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
    args,
    columnsCsv,
    formatSettings,
    name
  } = jobData ?? {}
  const { params } = args ?? {}

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

  const headerStringifier = stringify(
    { columns: ['empty', 'buy', 'empty', 'sell', 'empty', 'cumulative', 'empty'] }
  )
  const resStringifier = stringify({
    header: true,
    columns: columnsCsv
  })

  pipeline(headerStringifier, wStream, nope)
  pipeline(resStringifier, wStream, nope)

  const res = await getDataFromApi({
    getData: rService[name].bind(rService),
    args,
    callerName: 'CSV_WRITER'
  })

  write(
    [{ empty: '', buy: 'Buy', sell: 'Sell', cumulative: 'Cumulative' }],
    headerStringifier
  )
  write(
    res,
    resStringifier,
    formatSettings,
    params
  )

  queue.emit('progress', 100)

  headerStringifier.end()
  resStringifier.end()
}
