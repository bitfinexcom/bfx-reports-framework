'use strict'

const fs = require('fs/promises')
const path = require('path')
const argv = require('yargs').argv
const { v4: uuidv4 } = require('uuid')

const pdf = require('html-pdf')

const MainPdfWriter = require(
  'bfx-report/workers/loc.api/generate-report-file/pdf-writer'
)
const {
  createUniqueFileName
} = require('bfx-report/workers/loc.api/queue/helpers/utils')

const TEMPLATE_FILE_NAMES = require('./template-file-names')
const {
  PDFBufferUnderElectronCreationError
} = require('../../errors')

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
      orientation = 'Letter',
      headerHeight = '54mm',
      footerHeight = '28mm'
    } = args ?? {}

    if (this.isElectronjsEnv) {
      return await this.createPDFBufferUnderElectron({
        template,
        format,
        orientation
      })
    }

    const headerOpt = headerHeight
      ? { header: { height: headerHeight } }
      : {}
    const footerOpt = footerHeight
      ? { footer: { height: footerHeight } }
      : {}

    return await new Promise((resolve, reject) => {
      pdf.create(template, {
        ...headerOpt,
        ...footerOpt,

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

    const uniqueFileName = await createUniqueFileName(
      this.rootFolderPath,
      { isHTMLRequired: true }
    )
    await fs.writeFile(uniqueFileName, args?.template)

    const { promise } = this.processMessageManager.addStateToWait(
      this.processMessageManager.PROCESS_STATES.RESPONSE_PDF_CREATION,
      ({ data }) => data?.uid === uid
    )
    this.processMessageManager.sendState(
      this.processMessageManager.PROCESS_MESSAGES.REQUEST_PDF_CREATION,
      {
        templateFilePath: uniqueFileName,
        format: args?.format,
        orientation: args?.orientation,
        uid
      }
    )

    const {
      err,
      buffer,
      pdfFilePath
    } = (await promise) ?? {}

    if (err) {
      throw new PDFBufferUnderElectronCreationError(err)
    }

    if (
      pdfFilePath &&
      typeof pdfFilePath === 'string'
    ) {
      const fileBuffer = await fs.readFile(pdfFilePath)
      await fs.rm(pdfFilePath, { force: true, maxRetries: 3 })

      return fileBuffer
    }

    return Buffer.from(buffer)
  }
}

decorateInjectable(PdfWriter, depsTypes)

module.exports = PdfWriter
