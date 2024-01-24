'use strict'

const pdf = require('html-pdf')

const MainPdfWriter = require(
  'bfx-report/workers/loc.api/generate-report-file/pdf-writer'
)

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.HasGrcService,
  TYPES.GrcBfxReq
]
class PdfWriter extends MainPdfWriter {
  /**
   * @override
   */
  async createPDFBuffer (args) {
    const {
      template = 'No data',
      format = 'portrait',
      orientation = 'Letter'
    } = args ?? {}

    return await new Promise((resolve, reject) => {
      pdf.create(template, {
        format,
        orientation,
        type: 'pdf',
        childProcessOptions: {
          env: { OPENSSL_CONF: '/dev/null' }
        }
      }).toBuffer((error, buffer) => {
        if (error) return reject(error)
        resolve(buffer)
      })
    })
  }
}

decorateInjectable(PdfWriter, depsTypes)

module.exports = PdfWriter
