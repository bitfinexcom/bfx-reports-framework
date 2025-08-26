'use strict'

const {
  write
} = require('bfx-report/workers/loc.api/queue/write-data-to-stream/helpers')
const {
  streamWriter
} = require('bfx-report/workers/loc.api/generate-report-file/csv-writer/helpers')
const TRANSLATION_NAMESPACES = require(
  'bfx-report/workers/loc.api/i18next/translation.namespaces'
)
const {
  omitExtraParamFieldsForReportExport
} = require('bfx-report/workers/loc.api/generate-report-file/helpers')

module.exports = (
  rService,
  getDataFromApi,
  i18next
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
  const { language } = params ??

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
    taxes,
    delistedCcyList
  } = res ?? {}

  wStream.setMaxListeners(50)

  const csvStreamDataMap = [{
    columnParams: {
      header: true,
      columns: columnsCsv.taxes
    },
    writeFn: (stream) => write(
      taxes,
      stream,
      formatSettings.taxes,
      params
    )
  }]

  if (
    Array.isArray(delistedCcyList) &&
    delistedCcyList.length > 0
  ) {
    const transOpts = {
      lng: language,
      ns: TRANSLATION_NAMESPACES.PDF
    }
    const delistedCcyMessage = `\
${i18next.t('template.delistedCcyMessageStart', transOpts)}\
 ${delistedCcyList.join(', ')} 
${i18next.t('template.delistedCcyMessageEnd', transOpts)}\
`

    csvStreamDataMap.unshift({
      columnParams: { columns: ['delistedCcyMessage'] },
      writeFn: (stream) => write(
        [{ delistedCcyMessage }, {}],
        stream
      )
    })
  }

  await streamWriter(
    wStream,
    csvStreamDataMap
  )

  queue.emit('progress', 100)
}
