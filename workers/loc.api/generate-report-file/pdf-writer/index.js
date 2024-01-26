'use strict'

const path = require('path')
const pdf = require('html-pdf')

const MainPdfWriter = require(
  'bfx-report/workers/loc.api/generate-report-file/pdf-writer'
)

const TEMPLATE_FILE_NAMES = require('./template-file-names')

class PdfWriter extends MainPdfWriter {
  constructor (...deps) {
    super(...deps)

    this.addTranslations(this.loadTranslations(
      path.join(__dirname, 'translations.yml')
    ))
    this.addTemplates({
      fileNames: TEMPLATE_FILE_NAMES,
      templateFolderPath: path.join(__dirname, 'templates')
    })
    this.compileTemplate()
  }

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

module.exports = PdfWriter
