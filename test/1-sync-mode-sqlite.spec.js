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
  queueToPromise,
  delay,
  connToSQLite,
  closeSQLite
} = require('bfx-report/test/helpers/helpers.core')
const {
  testMethodOfGettingCsv
} = require('bfx-report/test/helpers/helpers.tests')

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
let processorQueue = null
let aggregatorQueue = null
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
    processorQueue = wrkReportServiceApi.lokue_processor.q
    aggregatorQueue = wrkReportServiceApi.lokue_aggregator.q

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

    const mockCandle = getMockData('candles')[0]
    const close = mockCandle[2]

    res.body.result.res.forEach(resItem => {
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

      if (
        ['USD', 'EUR', 'GBP', 'JPY'].every(symb => (
          symb !== resItem.currency
        ))
      ) {
        assert.isNumber(resItem.amountUsd)
        assert.isNumber(resItem.balanceUsd)
        assert.strictEqual(resItem.amountUsd, resItem.amount * close)
        assert.strictEqual(resItem.balanceUsd, resItem.balance * close)
      }
    })
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

    const mockCandle = getMockData('candles')[0]
    const close = mockCandle[2]

    res.body.result.forEach(resItem => {
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

      if (
        ['USD', 'EUR', 'GBP', 'JPY'].every(symb => (
          symb !== resItem.currency
        ))
      ) {
        assert.isNumber(resItem.balanceUsd)
        assert.strictEqual(resItem.balanceUsd, resItem.balance * close)
      }
    })
  })

  it('it should be successfully performed by the getRisk method', async function () {
    this.timeout(5000)

    const timeframeArr = ['day', 'month', 'year']
    const skipArr = [
      null,
      ['trades', 'marginTrades', 'fundingPayment'],
      ['trades', 'marginTrades', 'movementFees'],
      ['trades', 'fundingPayment', 'movementFees'],
      ['marginTrades', 'fundingPayment', 'movementFees']
    ]
    const paramsArr = Array(timeframeArr.length * skipArr.length)
      .fill({ start, end })
      .map((item, i) => {
        const timeframeIndex = i % timeframeArr.length
        const skipIndex = i % skipArr.length
        const skipParam = skipArr[skipIndex]
          ? { skip: skipArr[skipIndex] }
          : {}

        return {
          ...item,
          ...skipParam,
          timeframe: timeframeArr[timeframeIndex]
        }
      })

    for (const params of paramsArr) {
      const res = await agent
        .post(`${basePath}/get-data`)
        .type('json')
        .send({
          auth,
          method: 'getRisk',
          params,
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
        'mts',
        'USD',
        'EUR',
        'GBP',
        'JPY'
      ])
    }
  })

  it('it should be successfully performed by the getMultipleCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(processorQueue)
    const aggrPromise = queueToPromise(aggregatorQueue)

    const res = await agent
      .post(`${basePath}/get-data`)
      .type('json')
      .send({
        auth,
        method: 'getMultipleCsv',
        params: {
          email,
          multiExport: [
            {
              method: 'getTradesCsv',
              symbol: ['tBTCUSD', 'tETHUSD'],
              end,
              start,
              limit: 1000,
              timezone: 'America/Los_Angeles'
            },
            {
              method: 'getRiskCsv',
              end,
              start,
              timeframe: 'day'
            }
          ]
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getRiskCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(processorQueue)
    const aggrPromise = queueToPromise(aggregatorQueue)

    const res = await agent
      .post(`${basePath}/get-data`)
      .type('json')
      .send({
        auth,
        method: 'getRiskCsv',
        params: {
          end,
          start,
          timeframe: 'day',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })
})
