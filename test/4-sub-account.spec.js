'use strict'

const path = require('path')
const { assert } = require('chai')
const request = require('supertest')

const {
  stopEnvironment
} = require('bfx-report/test/helpers/helpers.boot')
const {
  rmDB,
  rmAllFiles
  // queueToPromise
} = require('bfx-report/test/helpers/helpers.core')
// const {
//   testMethodOfGettingCsv
// } = require('bfx-report/test/helpers/helpers.tests')

const {
  startEnvironment
} = require('./helpers/helpers.boot')
const {
  connToSQLite,
  closeSQLite
  // delay
} = require('./helpers/helpers.core')
const {
  createMockRESTv2SrvWithDate,
  getMockData
} = require('./helpers/helpers.mock-rest-v2')

process.env.NODE_CONFIG_DIR = path.join(__dirname, 'config')
const { app } = require('bfx-report-express')
const agent = request.agent(app)

// let wrkReportServiceApi = null
// let processorQueue = null
// let aggregatorQueue = null
let mockRESTv2Srv = null
let db = null

const basePath = '/api'
const tempDirPath = path.join(__dirname, '..', 'workers/loc.api/queue/temp')
const dbDirPath = path.join(__dirname, '..', 'db')
const date = new Date()
const end = date.getTime()
const start = (new Date()).setDate(date.getDate() - 90)
// const subUserEmail = 'sub-user@email.fake'
const masterUserEmail = 'master-user@email.fake'
// const subUserAuth = {
//   apiKey: 'subUserApiKey',
//   apiSecret: 'subUserApiSecret'
// }
const masterUserAuth = {
  apiKey: 'masterUserApiKey',
  apiSecret: 'masterUserApiSecret'
}
const subAccountAuth = {
  apiKey: 'masterUserApiKey-sub-account',
  apiSecret: 'masterUserApiSecret-sub-account'
}

const _getMockData = (mockData) => {
  return (methodName) => getMockData(methodName, mockData)
}
const masterUserMockData = new Map([
  [
    'user_info',
    [
      111,
      masterUserEmail,
      'masterUserName',
      null,
      null,
      null,
      null,
      'Kyiv'
    ]
  ]
])

describe('Sub-account', () => {
  before(async function () {
    this.timeout(20000)

    mockRESTv2Srv = createMockRESTv2SrvWithDate(
      start,
      end,
      100,
      { user_info: null },
      { _getMockData: _getMockData(masterUserMockData) }
    )

    await rmAllFiles(tempDirPath, ['README.md'])
    await rmDB(dbDirPath)
    await startEnvironment(false, false, 1, {
      dbDriver: 'sqlite'
    })
    // const env = await startEnvironment(false, false, 1, {
    //   dbDriver: 'sqlite'
    // })

    // wrkReportServiceApi = env.wrksReportServiceApi[0]
    // processorQueue = wrkReportServiceApi.lokue_processor.q
    // aggregatorQueue = wrkReportServiceApi.lokue_aggregator.q

    db = await connToSQLite()
  })

  after(async function () {
    this.timeout(5000)

    await stopEnvironment()
    await closeSQLite(db)
    await rmDB(dbDirPath)
    await rmAllFiles(tempDirPath, ['README.md'])

    try {
      await mockRESTv2Srv.close()
    } catch (err) { }
  })

  describe('Login', () => {
    it('it should be successfully performed by the login method for master user', async function () {
      this.timeout(5000)

      const res = await agent
        .post(`${basePath}/get-data`)
        .type('json')
        .send({
          masterUserAuth,
          method: 'login',
          id: 5
        })
        .expect('Content-Type', /json/)
        .expect(200)

      assert.isObject(res.body)
      assert.propertyVal(res.body, 'id', 5)
      assert.isOk(res.body.result === masterUserEmail)
    })

    it('it should not be successfully performed by the login method for sub-account', async function () {
      this.timeout(5000)

      const res = await agent
        .post(`${basePath}/get-data`)
        .type('json')
        .send({
          subAccountAuth,
          method: 'login',
          id: 5
        })
        .expect('Content-Type', /json/)
        .expect(401)

      assert.isObject(res.body)
      assert.propertyVal(res.body, 'id', 5)
      assert.isObject(res.body.error)
      assert.propertyVal(res.body.error, 'code', 401)
      assert.propertyVal(res.body.error, 'message', 'Unauthorized')
    })
  })
})
