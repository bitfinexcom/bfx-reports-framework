'use strict'

const path = require('path')
const argv = require('yargs').argv
const { v4: uuidv4 } = require('uuid')

const pdf = require('html-pdf')

const MainPdfWriter = require(
  'bfx-report/workers/loc.api/generate-report-file/pdf-writer'
)

const TEMPLATE_FILE_NAMES = require('./template-file-names')

class PdfWriter extends MainPdfWriter {
  constructor (...deps) {
    super(...deps)

    this.isElectronjsEnv = argv.isElectronjsEnv

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

    if (this.isElectronjsEnv) {
      return await this.createPDFBufferUnderElectron({
        template,
        format,
        orientation
      })
    }

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

  // TODO: Need to rework with using ProcessMessageManager
  async createPDFBufferUnderElectron (args) {
    const uid = `uid-${uuidv4()}-${Date.now()}`

    return await new Promise((resolve, reject) => {
      process.on('message', (mess) => {
        if (
          mess?.state !== 'response:created-pdf-buffer' &&
          mess?.state !== 'error:pdf-creation' &&
          mess?.data?.uid !== uid
        ) {
          return
        }
        if (mess?.state === 'error:pdf-creation') {
          reject(new Error(mess?.data?.error))
        }

        resolve(Buffer.from(mess?.data?.buffer))
      })

      process.send({
        state: 'request:create-pdf',
        data: {
          ...args,
          uid
        }
      })
    })
  }
}

module.exports = PdfWriter
