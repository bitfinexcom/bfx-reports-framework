'use strict'

const path = require('path')
const { assert } = require('chai')
const request = require('supertest')

const {
  startEnviroment,
  stopEnviroment
} = require('bfx-report/test/helpers/helpers.boot')
const {
  rmDB,
  rmAllFiles,
  delay,
  connToSQLite,
  closeSQLite
} = require('bfx-report/test/helpers/helpers.core')
const {
  createMockRESTv2SrvWithDate,
  getMockData
} = require('./helpers/helpers.mock-rest-v2')

process.env.NODE_CONFIG_DIR = path.join(__dirname, 'config')
const { app } = require('bfx-report-express')
const agent = request.agent(app)

let wrkReportServiceApi = null
let auth = {
  apiKey: 'fake',
  apiSecret: 'fake'
}
let mockRESTv2Srv = null
let db = null

const basePath = '/api'
const serviceRoot = path.join(__dirname, '..')
const tempDirPath = path.join(__dirname, '..', 'workers/loc.api/queue/temp')
const dbDirPath = path.join(__dirname, '..', 'db')
const date = new Date()
const end = date.getTime()
const start = (new Date()).setDate(date.getDate() - 90)
const email = 'fake@email.fake'

describe('Sync mode with SQLite', () => {
  before(async function () {
    this.timeout(20000)

    mockRESTv2Srv = createMockRESTv2SrvWithDate(start, end, 100)

    await rmAllFiles(tempDirPath)
    await rmDB(dbDirPath)
    const env = await startEnviroment(false, false, 1, {
      wtype: 'wrk-report-framework-api',
      syncMode: true,
      isSchedulerEnabled: true,
      dbDriver: 'sqlite'
    },
    serviceRoot)

    wrkReportServiceApi = env.wrksReportServiceApi[0]

    db = await connToSQLite(wrkReportServiceApi)
  })

  after(async function () {
    this.timeout(5000)

    await stopEnviroment()
    await closeSQLite(db)
    await rmDB(dbDirPath)
    await rmAllFiles(tempDirPath)

    try {
      await mockRESTv2Srv.close()
    } catch (err) { }
  })

  it('it should be successfully performed by the login method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/get-data`)
      .type('json')
      .send({
        auth,
        method: 'login',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isOk(res.body.result === email)
  })

  it('it should be successfully performed by the syncNow method', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/get-data`)
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

  it('it should be successfully performed by the getSyncProgress method', async function () {
    this.timeout(60000)

    while (true) {
      const res = await agent
        .post(`${basePath}/get-data`)
        .type('json')
        .send({
          auth,
          method: 'getSyncProgress',
          id: 5
        })
        .expect('Content-Type', /json/)
        .expect(200)

      assert.isObject(res.body)
      assert.propertyVal(res.body, 'id', 5)
      assert.isNumber(res.body.result)

      if (
        typeof res.body.result !== 'number' ||
        res.body.result === 100
      ) {
        break
      }

      await delay()
    }
  })

  it('it should be successfully performed by the getLedgers method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/get-data`)
      .type('json')
      .send({
        auth,
        method: 'getLedgers',
        params: {
          symbol: 'BTC',
          start: 0,
          end,
          limit: 2
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.isArray(res.body.result.res)
    assert.isNumber(res.body.result.nextPage)

    const resItem = res.body.result.res[0]

    assert.isObject(resItem)
    assert.containsAllKeys(resItem, [
      'id',
      'currency',
      'mts',
      'amount',
      'amountUsd',
      'balance',
      'balanceUsd',
      'description',
      'wallet'
    ])

    const mockCandle = getMockData('candles')[0]
    const close = mockCandle[2]

    assert.isNumber(resItem.amountUsd)
    assert.isNumber(resItem.balanceUsd)
    assert.strictEqual(resItem.amountUsd, resItem.amount * close)
    assert.strictEqual(resItem.balanceUsd, resItem.balance * close)
  })

  it('it should be successfully performed by the getWallets method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/get-data`)
      .type('json')
      .send({
        auth,
        method: 'getWallets',
        params: {
          end
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isArray(res.body.result)

    const resItem = res.body.result[0]

    assert.isObject(resItem)
    assert.containsAllKeys(resItem, [
      'type',
      'currency',
      'balance',
      'balanceUsd',
      'unsettledInterest',
      'balanceAvailable',
      'placeHolder',
      'mtsUpdate'
    ])

    const mockCandle = getMockData('candles')[0]
    const close = mockCandle[2]

    assert.isNumber(resItem.balanceUsd)
    assert.strictEqual(resItem.balanceUsd, resItem.balance * close)
  })
})
