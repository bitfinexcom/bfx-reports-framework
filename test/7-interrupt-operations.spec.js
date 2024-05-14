'use strict'

const {
  setTimeout
} = require('node:timers/promises')
const path = require('node:path')
const request = require('supertest')
const { assert } = require('chai')

const {
  stopEnvironment
} = require('bfx-report/test/helpers/helpers.boot')
const {
  rmDB,
  rmAllFiles
} = require('bfx-report/test/helpers/helpers.core')

const {
  startEnvironment
} = require('./helpers/helpers.boot')
const {
  getRServiceProxy,
  emptyDB,
  rmRf
} = require('./helpers/helpers.core')
const {
  createMockRESTv2SrvWithDate
} = require('./helpers/helpers.mock-rest-v2')

process.env.NODE_CONFIG_DIR = path.join(__dirname, 'config')
const { app } = require('bfx-report-express')
const agent = request.agent(app)

const {
  signUpTestCase,
  getSyncProgressTestCase
} = require('./test-cases')

let wrkReportServiceApi = null
let mockRESTv2Srv = null

const basePath = '/api'
const tempDirPath = path.join(__dirname, '..', 'workers/loc.api/queue/temp')
const dbDirPath = path.join(__dirname, '..', 'db')
const reportFolderPath = path.join(__dirname, '..', 'report-files')
const date = new Date()
const end = date.getTime()
const start = (new Date()).setDate(date.getDate() - 90)

const apiKeys = {
  apiKey: 'fake',
  apiSecret: 'fake'
}
const email = 'fake@email.fake'
const password = '123Qwerty'
const isSubAccount = false

describe('Interrupt operations', () => {
  const params = {
    processorQueue: null,
    aggregatorQueue: null,
    basePath,
    auth: {
      email,
      password,
      isSubAccount
    },
    apiKeys,
    date,
    end,
    start
  }
  const auth = { token: 'user-token' }

  before(async function () {
    this.timeout(20000)

    mockRESTv2Srv = createMockRESTv2SrvWithDate(start, end, 100)

    await rmRf(reportFolderPath)
    await rmAllFiles(tempDirPath, ['README.md'])
    await rmDB(dbDirPath)
    const env = await startEnvironment(false, false, 1)

    wrkReportServiceApi = env.wrksReportServiceApi[0]
    const rService = wrkReportServiceApi.grc_bfx.api
    const rServiceProxy = getRServiceProxy(rService, {
      async _getPublicTrades (targetMethod, context, argsList) {
        await setTimeout(5000)

        return Reflect.apply(...arguments)
      }
    })
    rService._transactionTaxReport.rService = rServiceProxy
    params.processorQueue = wrkReportServiceApi.lokue_processor.q
    params.aggregatorQueue = wrkReportServiceApi.lokue_aggregator.q

    await emptyDB()
  })

  after(async function () {
    this.timeout(20000)

    await stopEnvironment()
    await rmDB(dbDirPath)
    await rmAllFiles(tempDirPath, ['README.md'])
    await rmRf(reportFolderPath)

    try {
      await mockRESTv2Srv.close()
    } catch (err) { }
  })

  signUpTestCase(agent, params, (token) => { auth.token = token })

  it('it should be successfully performed by the syncNow method', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'syncNow',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isOk(
      typeof res.body.result === 'number' ||
      res.body.result === 'SYNCHRONIZATION_IS_STARTED'
    )
  })

  getSyncProgressTestCase(agent, { basePath, auth })

  it('it should interrupt transaction tax report', async function () {
    this.timeout(60000)

    const trxTaxReportPromise = agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTransactionTaxReport',
        params: {
          end,
          start: start + (45 * 24 * 60 * 60 * 1000),
          strategy: 'LIFO'
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)
    const interruptOperationsPromise = setTimeout(1000).then(() => {
      return agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth,
          method: 'interruptOperations',
          params: {
            names: ['TRX_TAX_REPORT_INTERRUPTER']
          },
          id: 5
        })
        .expect('Content-Type', /json/)
        .expect(200)
    })

    const [
      trxTaxReport,
      interruptOperations
    ] = await Promise.all([
      trxTaxReportPromise,
      interruptOperationsPromise
    ])

    assert.isObject(interruptOperations.body)
    assert.propertyVal(interruptOperations.body, 'id', 5)
    assert.isBoolean(interruptOperations.body.result)
    assert.isOk(interruptOperations.body.result)

    assert.isObject(trxTaxReport.body)
    assert.propertyVal(trxTaxReport.body, 'id', 5)
    assert.isArray(trxTaxReport.body.result)
    assert.lengthOf(trxTaxReport.body.result, 0)
  })

  it('it should not be successfully performed by the interruptOperations method', async function () {
    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'interruptOperations',
        params: {
          names: [
            'FAKE_INTERRUPTER',
            'TRX_TAX_REPORT_INTERRUPTER'
          ]
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(400)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 400)
    assert.propertyVal(res.body.error, 'message', 'Args params is not valid')
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should interrupt transaction tax report after sign-out', async function () {
    this.timeout(60000)

    const trxTaxReportPromise = agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTransactionTaxReport',
        params: {
          end,
          start: start + (45 * 24 * 60 * 60 * 1000),
          strategy: 'LIFO'
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)
    const signOutPromise = setTimeout(1000).then(() => {
      return agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth,
          method: 'signOut',
          id: 5
        })
        .expect('Content-Type', /json/)
        .expect(200)
    })

    const [
      trxTaxReport,
      signOut
    ] = await Promise.all([
      trxTaxReportPromise,
      signOutPromise
    ])

    assert.isObject(signOut.body)
    assert.propertyVal(signOut.body, 'id', 5)
    assert.isBoolean(signOut.body.result)
    assert.isOk(signOut.body.result)

    assert.isObject(trxTaxReport.body)
    assert.propertyVal(trxTaxReport.body, 'id', 5)
    assert.isArray(trxTaxReport.body.result)
    assert.lengthOf(trxTaxReport.body.result, 0)
  })
})
