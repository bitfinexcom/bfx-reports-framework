'use strict'

const path = require('path')
const { assert } = require('chai')
const request = require('supertest')

const {
  stopEnvironment
} = require('bfx-report/test/helpers/helpers.boot')
const {
  rmDB,
  rmAllFiles,
  queueToPromise
} = require('bfx-report/test/helpers/helpers.core')
const {
  testMethodOfGettingCsv
} = require('bfx-report/test/helpers/helpers.tests')

const {
  startEnvironment
} = require('./helpers/helpers.boot')
const {
  connToSQLite,
  closeSQLite,
  delay
} = require('./helpers/helpers.core')
const {
  createMockRESTv2SrvWithDate
} = require('./helpers/helpers.mock-rest-v2')

process.env.NODE_CONFIG_DIR = path.join(__dirname, 'config')
const { app } = require('bfx-report-express')
const agent = request.agent(app)

let wrkReportServiceApi = null
let processorQueue = null
let aggregatorQueue = null
let mockRESTv2Srv = null
let db = null

const basePath = '/api'
const tempDirPath = path.join(__dirname, '..', 'workers/loc.api/queue/temp')
const dbDirPath = path.join(__dirname, '..', 'db')
const date = new Date()
const end = date.getTime()
const start = (new Date()).setDate(date.getDate() - 90)
const email = 'fake@email.fake'
const auth = {
  apiKey: 'fake',
  apiSecret: 'fake'
}

describe('Additional sync mode API with SQLite', () => {
  before(async function () {
    this.timeout(20000)

    mockRESTv2Srv = createMockRESTv2SrvWithDate(start, end, 100)

    await rmAllFiles(tempDirPath, ['README.md'])
    await rmDB(dbDirPath)
    const env = await startEnvironment(false, false, 1, {
      dbDriver: 'sqlite'
    })

    wrkReportServiceApi = env.wrksReportServiceApi[0]
    processorQueue = wrkReportServiceApi.lokue_processor.q
    aggregatorQueue = wrkReportServiceApi.lokue_aggregator.q

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

  it('it should be successfully performed by the getBalanceHistory method', async function () {
    this.timeout(5000)

    const timeframeArr = ['day', 'month', 'year']
    const paramsArr = Array(timeframeArr.length)
      .fill({ start, end })
      .map((item, i) => {
        const timeframeIndex = i % timeframeArr.length

        return {
          ...item,
          timeframe: timeframeArr[timeframeIndex]
        }
      })

    for (const params of paramsArr) {
      const res = await agent
        .post(`${basePath}/get-data`)
        .type('json')
        .send({
          auth,
          method: 'getBalanceHistory',
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
        'USD'
      ])
    }
  })

  it('it should be successfully performed by the getWinLoss method', async function () {
    this.timeout(5000)

    const timeframeArr = ['day', 'month', 'year']
    const paramsArr = Array(timeframeArr.length)
      .fill({ start, end })
      .map((item, i) => {
        const timeframeIndex = i % timeframeArr.length

        return {
          ...item,
          timeframe: timeframeArr[timeframeIndex]
        }
      })

    for (const params of paramsArr) {
      const res = await agent
        .post(`${basePath}/get-data`)
        .type('json')
        .send({
          auth,
          method: 'getWinLoss',
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
        'USD'
      ])
    }
  })

  it('it should be successfully performed by the getPositionsSnapshot method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/get-data`)
      .type('json')
      .send({
        auth,
        method: 'getPositionsSnapshot',
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

    res.body.result.forEach((item) => {
      assert.isObject(item)
      assert.containsAllKeys(item, [
        'id',
        'symbol',
        'amount',
        'basePrice',
        'actualPrice',
        'pl',
        'plUsd',
        'plPerc',
        'marginFunding',
        'marginFundingType',
        'status',
        'mtsCreate',
        'mtsUpdate'
      ])
    })
  })

  it('it should be successfully performed by the getPositionsSnapshot method with a start param', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/get-data`)
      .type('json')
      .send({
        auth,
        method: 'getPositionsSnapshot',
        params: {
          end,
          start: end
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isArray(res.body.result)

    res.body.result.forEach((item) => {
      assert.isObject(item)
      assert.containsAllKeys(item, [
        'id',
        'symbol',
        'amount',
        'basePrice',
        'actualPrice',
        'pl',
        'plUsd',
        'plPerc',
        'marginFunding',
        'marginFundingType',
        'status',
        'mtsCreate',
        'mtsUpdate'
      ])
    })
  })

  it('it should be successfully performed by the getFullSnapshotReport method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/get-data`)
      .type('json')
      .send({
        auth,
        method: 'getFullSnapshotReport',
        params: {
          end
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.isArray(res.body.result.positionsSnapshot)
    assert.isArray(res.body.result.walletsSnapshot)

    res.body.result.positionsSnapshot.forEach((item) => {
      assert.isObject(item)
      assert.containsAllKeys(item, [
        'id',
        'symbol',
        'amount',
        'basePrice',
        'actualPrice',
        'pl',
        'plUsd',
        'plPerc',
        'marginFunding',
        'marginFundingType',
        'status',
        'mtsCreate',
        'mtsUpdate'
      ])
    })
    res.body.result.walletsSnapshot.forEach((item) => {
      assert.isObject(item)
      assert.containsAllKeys(item, [
        'type',
        'currency',
        'balance',
        'balanceUsd'
      ])
    })
  })

  it('it should be successfully performed by the getFullSnapshotReport method with a start param', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/get-data`)
      .type('json')
      .send({
        auth,
        method: 'getFullSnapshotReport',
        params: {
          end,
          start: end - (10 * 60 * 60 * 1000)
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.isArray(res.body.result.positionsSnapshot)
    assert.isArray(res.body.result.walletsSnapshot)

    res.body.result.positionsSnapshot.forEach((item) => {
      assert.isObject(item)
      assert.containsAllKeys(item, [
        'id',
        'symbol',
        'amount',
        'basePrice',
        'actualPrice',
        'pl',
        'plUsd',
        'plPerc',
        'marginFunding',
        'marginFundingType',
        'status',
        'mtsCreate',
        'mtsUpdate'
      ])
    })
    res.body.result.walletsSnapshot.forEach((item) => {
      assert.isObject(item)
      assert.containsAllKeys(item, [
        'type',
        'currency',
        'balance',
        'balanceUsd'
      ])
    })
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
              method: 'getBalanceHistoryCsv',
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

  it('it should be successfully performed by the getBalanceHistoryCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(processorQueue)
    const aggrPromise = queueToPromise(aggregatorQueue)

    const res = await agent
      .post(`${basePath}/get-data`)
      .type('json')
      .send({
        auth,
        method: 'getBalanceHistoryCsv',
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

  it('it should be successfully performed by the getWinLossCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(processorQueue)
    const aggrPromise = queueToPromise(aggregatorQueue)

    const res = await agent
      .post(`${basePath}/get-data`)
      .type('json')
      .send({
        auth,
        method: 'getWinLossCsv',
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

  it('it should be successfully performed by the getFullSnapshotReportCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(processorQueue)
    const aggrPromise = queueToPromise(aggregatorQueue)

    const res = await agent
      .post(`${basePath}/get-data`)
      .type('json')
      .send({
        auth,
        method: 'getFullSnapshotReportCsv',
        params: {
          end,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getPositionsSnapshotCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(processorQueue)
    const aggrPromise = queueToPromise(aggregatorQueue)

    const res = await agent
      .post(`${basePath}/get-data`)
      .type('json')
      .send({
        auth,
        method: 'getPositionsSnapshotCsv',
        params: {
          end,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })
})
