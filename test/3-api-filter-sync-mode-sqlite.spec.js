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
const middle = (new Date()).setDate(date.getDate() - 45)
const email = 'fake@email.fake'
const auth = {
  apiKey: 'fake',
  apiSecret: 'fake'
}

// TODO:
describe.skip('API filter', () => {
  before(async function () {
    this.timeout(5000)

    mockRESTv2Srv = createMockRESTv2SrvWithDate(start, end, 10)

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
      .post(`${basePath}/json-rpc`)
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

  it('it should be successfully performed by the getSyncProgress method', async function () {
    this.timeout(60000)

    while (true) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
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

  it('it should be successfully performed by the editPublicTradesConf method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'editPublicTradesConf',
        params: [
          {
            start,
            symbol: 'tBTCUSD'
          }
        ],
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isOk(res.body.result)
  })

  it('it should be successfully performed by the getSyncProgress method', async function () {
    this.timeout(60000)

    while (true) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
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

  it('it should be successfully performed by the editTickersHistoryConf method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'editTickersHistoryConf',
        params: [
          {
            start,
            symbol: 'BTC'
          }
        ],
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isOk(res.body.result)
  })

  it('it should be successfully performed by the getSyncProgress method', async function () {
    this.timeout(60000)

    while (true) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
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

  it('it should be successfully performed by the api methods', async function () {
    this.timeout(10000)

    const baseArgs = {
      auth,
      id: 5
    }
    const baseParams = {
      start: 0,
      end,
      limit: 10
    }
    const argsArr = [
      {
        args: {
          ...baseArgs,
          method: 'getTickersHistory',
          params: {
            ...baseParams,
            symbol: 'BTC',
            filter: {
              $lt: { mtsUpdate: middle }
            }
          }
        },
        responseTest: (res) => {
          assert.isAbove(res.length, 0)

          res.forEach((item) => {
            assert.isObject(item)
            assert.containsAllKeys(item, [
              'symbol',
              'bid',
              'bidPeriod',
              'ask',
              'mtsUpdate'
            ])
            assert(Number.isInteger(item.mtsUpdate))
            assert.isBelow(item.mtsUpdate, middle)
          })
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getPositionsHistory',
          params: {
            ...baseParams,
            symbol: 'tBTCUSD',
            filter: {
              $gte: { id: 12347 }
            }
          }
        },
        responseTest: (res) => {
          assert.isAbove(res.length, 0)

          res.forEach((item) => {
            assert.isObject(item)
            assert.containsAllKeys(item, [
              'symbol',
              'status',
              'amount',
              'basePrice',
              'marginFunding',
              'marginFundingType',
              'pl',
              'plPerc',
              'liquidationPrice',
              'leverage',
              'placeholder',
              'id',
              'mtsCreate',
              'mtsUpdate'
            ])
            assert(Number.isInteger(item.id))
            assert.isAtLeast(item.id, 12347)
          })
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getPositionsAudit',
          params: {
            ...baseParams,
            id: [12345, 12346, 12347],
            symbol: 'tBTCUSD',
            filter: {
              $lte: { id: 12346 }
            }
          }
        },
        responseTest: (res) => {
          assert.isAbove(res.length, 0)

          res.forEach((item) => {
            assert.isObject(item)
            assert.containsAllKeys(item, [
              'symbol',
              'status',
              'amount',
              'basePrice',
              'marginFunding',
              'marginFundingType',
              'pl',
              'plPerc',
              'liquidationPrice',
              'leverage',
              'id',
              'mtsCreate',
              'mtsUpdate',
              'collateral',
              'collateralMin',
              'meta'
            ])
            assert(Number.isInteger(item.id))
            assert.isAtMost(item.id, 12346)
          })
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getLedgers',
          params: {
            ...baseParams,
            symbol: 'BTC',
            filter: {
              $gt: { id: 12346 }
            }
          }
        },
        responseTest: (res) => {
          assert.isAbove(res.length, 0)

          res.forEach((item) => {
            assert.isObject(item)
            assert.containsAllKeys(item, [
              'id',
              'currency',
              'mts',
              'amount',
              'balance',
              'description',
              'wallet'
            ])
            assert(Number.isInteger(item.id))
            assert.isAbove(item.id, 12346)
          })
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getTrades',
          params: {
            ...baseParams,
            symbol: 'tBTCUSD',
            filter: {
              $eq: { id: 12345 }
            }
          }
        },
        responseTest: (res) => {
          assert.isAbove(res.length, 0)

          res.forEach((item) => {
            assert.isObject(item)
            assert.containsAllKeys(item, [
              'id',
              'symbol',
              'mtsCreate',
              'orderID',
              'execAmount',
              'execPrice',
              'orderType',
              'orderPrice',
              'maker',
              'fee',
              'feeCurrency'
            ])
            assert(Number.isInteger(item.id))
            assert.equal(item.id, 12345)
          })
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getFundingTrades',
          params: {
            ...baseParams,
            symbol: 'fBTC',
            filter: {
              $ne: { id: 12346 }
            }
          }
        },
        responseTest: (res) => {
          assert.isAbove(res.length, 0)

          res.forEach((item) => {
            assert.isObject(item)
            assert.containsAllKeys(item, [
              'id',
              'symbol',
              'mtsCreate',
              'offerID',
              'amount',
              'rate',
              'period',
              'maker'
            ])
            assert(Number.isInteger(item.id))
            assert.notEqual(item.id, 12346)
          })
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getPublicTrades',
          params: {
            ...baseParams,
            symbol: 'tBTCUSD',
            filter: {
              $not: { id: 12346 }
            }
          }
        },
        responseTest: (res) => {
          assert.isAbove(res.length, 0)

          res.forEach((item) => {
            assert.isObject(item)
            assert.containsAllKeys(item, [
              'id',
              'mts',
              'amount',
              'price'
            ])
            assert(Number.isInteger(item.id))
            assert.notEqual(item.id, 12346)
          })
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getOrderTrades',
          params: {
            ...baseParams,
            id: 12345,
            symbol: 'tBTCUSD',
            filter: {
              $like: { symbol: 'tBTC%' }
            }
          }
        },
        responseTest: (res) => {
          assert.isAbove(res.length, 0)

          res.forEach((item) => {
            assert.isObject(item)
            assert.containsAllKeys(item, [
              'id',
              'symbol',
              'mtsCreate',
              'orderID',
              'execAmount',
              'execPrice',
              'orderType',
              'orderPrice',
              'maker',
              'fee',
              'feeCurrency'
            ])
            assert.isString(item.symbol)
            assert.match(item.symbol, /^tBTC/)
          })
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getOrders',
          params: {
            ...baseParams,
            symbol: 'tBTCUSD',
            filter: {
              $like: { symbol: 'tETH%' }
            }
          }
        },
        responseTest: (res) => {
          assert.lengthOf(res, 0)
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getMovements',
          params: {
            ...baseParams,
            symbol: 'BTC',
            filter: {
              $in: { id: [12345, 12346, 12347] }
            }
          }
        },
        responseTest: (res) => {
          assert.isAbove(res.length, 0)

          res.forEach((item) => {
            assert.isObject(item)
            assert.containsAllKeys(item, [
              'id',
              'currency',
              'currencyName',
              'mtsStarted',
              'mtsUpdated',
              'status',
              'amount',
              'fees',
              'destinationAddress',
              'transactionId'
            ])
            assert(Number.isInteger(item.id))
            assert.include([12345, 12346, 12347], item.id)
          })
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getFundingOfferHistory',
          params: {
            ...baseParams,
            symbol: 'fUSD',
            filter: {
              $nin: { id: [12345, 12346, 12347] }
            }
          }
        },
        responseTest: (res) => {
          assert.isAbove(res.length, 0)

          res.forEach((item) => {
            assert.isObject(item)
            assert.containsAllKeys(item, [
              'id',
              'symbol',
              'mtsCreate',
              'mtsUpdate',
              'amount',
              'amountOrig',
              'type',
              'flags',
              'status',
              'rate',
              'period',
              'notify',
              'hidden',
              'renew',
              'rateReal',
              'amountExecuted'
            ])
            assert(Number.isInteger(item.id))
            assert.notInclude([12345, 12346, 12347], item.id)
          })
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getFundingLoanHistory',
          params: {
            ...baseParams,
            symbol: 'fUSD',
            filter: {
              $nin: { id: [12345, 12346, 12347] }
            }
          }
        },
        responseTest: (res) => {
          assert.isAbove(res.length, 0)

          res.forEach((item) => {
            assert.isObject(item)
            assert.containsAllKeys(item, [
              'id',
              'symbol',
              'side',
              'mtsCreate',
              'mtsUpdate',
              'amount',
              'flags',
              'status',
              'rate',
              'period',
              'mtsOpening',
              'mtsLastPayout',
              'notify',
              'hidden',
              'renew',
              'rateReal',
              'noClose'
            ])
            assert(Number.isInteger(item.id))
            assert.notInclude([12345, 12346, 12347], item.id)
          })
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getFundingCreditHistory',
          params: {
            ...baseParams,
            symbol: 'fUSD',
            filter: {
              $isNull: ['flags']
            }
          }
        },
        responseTest: (res) => {
          assert.isAbove(res.length, 0)

          res.forEach((item) => {
            assert.isObject(item)
            assert.containsAllKeys(item, [
              'id',
              'symbol',
              'side',
              'mtsCreate',
              'mtsUpdate',
              'amount',
              'flags',
              'status',
              'rate',
              'period',
              'mtsOpening',
              'mtsLastPayout',
              'notify',
              'hidden',
              'renew',
              'rateReal',
              'noClose',
              'positionPair'
            ])
            assert.isNull(item.flags)
          })
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getFundingCreditHistory',
          params: {
            ...baseParams,
            symbol: 'fUSD',
            filter: {
              $isNotNull: ['flags']
            }
          }
        },
        responseTest: (res) => {
          assert.lengthOf(res, 0)
        }
      }
    ]

    for (const { args, responseTest } of argsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send(args)
        .expect('Content-Type', /json/)
        .expect(200)

      assert.isObject(res.body)
      assert.propertyVal(res.body, 'id', 5)
      assert.isObject(res.body.result)
      assert.isArray(res.body.result.res)

      responseTest(res.body.result.res)
    }
  })

  it('it should not be successfully performed by the api methods', async function () {
    this.timeout(60000)

    const baseArgs = {
      auth,
      id: 5
    }
    const baseParams = {
      start,
      end,
      limit: 1000,
      timezone: -3,
      email
    }
    const argsArr = [
      {
        args: {
          ...baseArgs,
          method: 'getLedgersCsv',
          params: {
            ...baseParams,
            symbol: ['BTC'],
            filter: {
              $gte: { someFakeField: 12345 }
            }
          }
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getLedgersCsv',
          params: {
            ...baseParams,
            symbol: ['BTC'],
            filter: {
              $gte: '12345'
            }
          }
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getLedgersCsv',
          params: {
            ...baseParams,
            symbol: ['BTC'],
            filter: {
              $gte: { id: '12345' }
            }
          }
        }
      },
      {
        args: {
          ...baseArgs,
          method: 'getTradesCsv',
          params: {
            ...baseParams,
            symbol: ['tBTCUSD', 'tETHUSD'],
            filter: {
              $someCond: { id: 12345 }
            }
          }
        }
      }
    ]

    for (const { args } of argsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send(args)
        .expect('Content-Type', /json/)
        .expect(500)

      assert.isObject(res.body)
      assert.isObject(res.body.error)
      assert.propertyVal(res.body.error, 'code', 500)
      assert.propertyVal(res.body.error, 'message', 'Internal Server Error')
      assert.propertyVal(res.body, 'id', 5)
    }
  })

  it('it should be successfully performed by not consider capital letters on filters', async function () {
    this.timeout(60000)

    const baseArgs = {
      auth,
      id: 5
    }
    const baseParams = {
      start: 0,
      end,
      limit: 10
    }
    const argsArr = [
      {
        args: {
          ...baseArgs,
          method: 'getLedgers',
          params: {
            ...baseParams,
            symbol: 'BTC',
            filter: {
              $eq: { wallet: 'fUnding' },
              $ne: {
                description: 'margin funDINg payment (some else data) on wallet funding'
              },
              $like: { description: 'margin funding%' },
              $nin: { currency: ['eUR', 'JpY'] },
              $in: { currency: ['BTc'] }
            }
          }
        },
        responseTest: (res) => {
          assert.isAbove(res.length, 0)

          res.forEach((item) => {
            assert.isObject(item)
            assert.containsAllKeys(item, [
              'id',
              'currency',
              'mts',
              'amount',
              'balance',
              'description',
              'wallet'
            ])

            const {
              currency,
              description,
              wallet
            } = item

            assert.strictEqual(wallet, 'funding')
            assert.notStrictEqual(
              description,
              'Margin Funding Payment (some else data) on wallet funding'
            )
            assert.match(description, /^Margin Funding/)
            assert.notInclude(['EUR', 'JPY'], currency)
            assert.include(['BTC'], currency)
          })
        }
      }
    ]

    for (const { args, responseTest } of argsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send(args)
        .expect('Content-Type', /json/)
        .expect(200)

      assert.isObject(res.body)
      assert.propertyVal(res.body, 'id', 5)
      assert.isObject(res.body.result)
      assert.isArray(res.body.result.res)

      responseTest(res.body.result.res)
    }
  })

  it('it should be successfully performed by the getLedgersCsv method', async function () {
    this.timeout(20000)

    const procPromise = queueToPromise(processorQueue)
    const aggrPromise = queueToPromise(aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getLedgersCsv',
        params: {
          symbol: ['BTC'],
          end,
          start,
          limit: 1000,
          timezone: -3,
          email,
          filter: {
            $gte: { id: 12345 }
          }
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getMultipleCsv method', async function () {
    this.timeout(20000)

    const procPromise = queueToPromise(processorQueue)
    const aggrPromise = queueToPromise(aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getMultipleCsv',
        params: {
          email,
          language: 'ru',
          multiExport: [
            {
              method: 'getTradesCsv',
              symbol: ['tBTCUSD', 'tETHUSD'],
              end,
              start,
              limit: 1000,
              timezone: 'America/Los_Angeles',
              filter: {
                $or: {
                  $eq: { id: 12346 },
                  $lt: { mtsCreate: middle }
                }
              }
            },
            {
              method: 'getTickersHistoryCsv',
              symbol: 'BTC',
              end,
              start,
              limit: 1000,
              filter: {
                $gte: { mtsUpdate: middle }
              }
            }
          ]
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })
})
