'use strict'

const path = require('path')
const argv = require('yargs').argv
const { v4: uuidv4 } = require('uuid')

const pdf = require('html-pdf')

const MainPdfWriter = require(
  'bfx-report/workers/loc.api/generate-report-file/pdf-writer'
)

const TEMPLATE_FILE_NAMES = require('./template-file-names')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.ROOT_FOLDER_PATH,
  TYPES.HasGrcService,
  TYPES.GrcBfxReq,
  TYPES.ProcessMessageManager
]
class PdfWriter extends MainPdfWriter {
  constructor (
    rootFolderPath,
    hasGrcService,
    grcBfxReq,
    processMessageManager
  ) {
    super(
      rootFolderPath,
      hasGrcService,
      grcBfxReq
    )

    this.processMessageManager = processMessageManager

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

  async createPDFBufferUnderElectron (args) {
    const uid = `uid-${uuidv4()}-${Date.now()}`

    const { promise } = this.processMessageManager.addStateToWait(
      this.processMessageManager.PROCESS_STATES.RESPONSE_PDF_CREATION,
      ({ data }) => data?.uid === uid
    )
    this.processMessageManager.sendState(
      this.processMessageManager.PROCESS_MESSAGES.REQUEST_PDF_CREATION,
      { ...args, uid }
    )

    const {
      err,
      buffer
    } = (await promise) ?? {}

    if (err) {
      // TODO: Need to add custom error class
      throw new Error(err)
    }

    return Buffer.from(buffer)
  }
}

decorateInjectable(PdfWriter, depsTypes)

module.exports = PdfWriter
