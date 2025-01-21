'use strict'

const fs = require('fs/promises')
const path = require('path')
const argv = require('yargs').argv
const { v4: uuidv4 } = require('uuid')

const puppeteer = require('puppeteer')

const MainPdfWriter = require(
  'bfx-report/workers/loc.api/generate-report-file/pdf-writer'
)
const {
  createUniqueFileName
} = require('bfx-report/workers/loc.api/queue/helpers/utils')

const TEMPLATE_FILE_NAMES = require('./template-file-names')
const {
  PDFBufferUnderElectronCreationError
} = require('bfx-report/workers/loc.api/errors')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.ROOT_FOLDER_PATH,
  TYPES.HasGrcService,
  TYPES.GrcBfxReq,
  TYPES.I18next,
  TYPES.ProcessMessageManager
]
class PdfWriter extends MainPdfWriter {
  constructor (
    rootFolderPath,
    hasGrcService,
    grcBfxReq,
    i18next,
    processMessageManager
  ) {
    super(
      rootFolderPath,
      hasGrcService,
      grcBfxReq,
      i18next
    )

    this.processMessageManager = processMessageManager

    this.isElectronjsEnv = argv.isElectronjsEnv
    this.shouldZoomBeAdjusted = false

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

    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.setContent(template, {
      waitUntil: 'domcontentloaded'
    })
    await page.emulateMediaType('print')
    const u8ArrayPdf = await page.pdf({
      landscape: format !== 'portrait',
      format: orientation,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      },
      displayHeaderFooter: true,
      footerTemplate: this.#getFooterTemplate(args)
    })
    await browser.close()

    return Buffer.from(u8ArrayPdf)
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

  #getFooterTemplate (args) {
    const translate = this.getTranslator(args?.language ?? 'en')

    return `\
<span style="
    position: absolute;
    right: 10px;
    bottom: 10px;
    font-weight: 400;
    font-size: 8px;
  ">
  ${translate('Page', 'template.page')} <span class=pageNumber></span> ${translate('from', 'template.from')} <span class=totalPages></span>
</span>`
  }
}

decorateInjectable(PdfWriter, depsTypes)

module.exports = PdfWriter
