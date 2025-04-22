'use strict'

const { assert } = require('chai')

const {
  queueToPromise
} = require('bfx-report/test/helpers/helpers.core')
const {
  testMethodOfGettingReportFile
} = require('bfx-report/test/helpers/helpers.tests')

const {
  getParamsArrToTestTimeframeGrouping
} = require('../helpers/helpers.core')
const {
  testReportPathHasCommonFolder
} = require('../helpers/helpers.tests')

const getSyncProgressTestCase = require('./get-sync-progress-test-case')

module.exports = (
  agent,
  params = {}
) => {
  const {
    basePath,
    auth: {
      email,
      password,
      isSubAccount
    },
    end,
    start,
    isPDFRequired
  } = params
  const auth = { token: '' }

  it('it should be successfully performed by the signIn method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: {
          email,
          password,
          isSubAccount
        },
        method: 'signIn',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.strictEqual(res.body.result.email, email)
    assert.strictEqual(res.body.result.isSubAccount, isSubAccount)
    assert.isString(res.body.result.token)

    auth.token = res.body.result.token
  })

  it('it should be successfully performed by the enableSyncMode method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'enableSyncMode',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isBoolean(res.body.result)
    assert.isOk(res.body.result)
  })

  it('it should be successfully performed by the enableScheduler method', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'enableScheduler',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isBoolean(res.body.result)
    assert.isOk(res.body.result)
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

  getSyncProgressTestCase(agent, { basePath, auth })

  it('it should be successfully performed by the signIn method, lastSyncMts is integer', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'signIn',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.isOk(Number.isInteger(res.body.result.lastSyncMts))
  })

  it('it should be successfully performed by the getBalanceHistory method', async function () {
    this.timeout(5000)

    const paramsArr = getParamsArrToTestTimeframeGrouping({ start, end })

    for (const params of paramsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
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
    this.timeout(120000)

    const paramsArr = getParamsArrToTestTimeframeGrouping({ start, end })

    for (const params of paramsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
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
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
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

  it('it should be successfully performed by the getFullSnapshotReport method', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
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
    assert.isArray(res.body.result.positionsTickers)
    assert.isArray(res.body.result.walletsTickers)
    assert.isNumber(res.body.result.positionsTotalPlUsd)
    assert.isNumber(res.body.result.walletsTotalBalanceUsd)

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
    res.body.result.positionsTickers.forEach((item) => {
      assert.isObject(item)
      assert.containsAllKeys(item, [
        'symbol',
        'amount'
      ])
    })
    res.body.result.walletsTickers.forEach((item) => {
      assert.isObject(item)
      assert.containsAllKeys(item, [
        'walletType',
        'symbol',
        'amount'
      ])
    })
  })

  it('it should be successfully performed by the getFullTaxReport method', async function () {
    this.timeout(120000)

    const paramsArr = [
      { end, start },
      { end, start: end - (10 * 60 * 60 * 1000) }
    ]

    for (const params of paramsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth,
          method: 'getFullTaxReport',
          params,
          id: 5
        })
        .expect('Content-Type', /json/)
        .expect(200)

      assert.isObject(res.body)
      assert.propertyVal(res.body, 'id', 5)
      assert.isObject(res.body.result)

      assert.isArray(res.body.result.startingPositionsSnapshot)
      assert.isArray(res.body.result.endingPositionsSnapshot)
      assert.isObject(res.body.result.finalState)
      assert.isObject(res.body.result.finalState.startingPeriodBalances)
      assert.isArray(res.body.result.finalState.movements)
      assert.isNumber(res.body.result.finalState.movementsTotalAmount)
      assert.isObject(res.body.result.finalState.endingPeriodBalances)
      assert.isNumber(res.body.result.finalState.totalResult)

      const positions = [
        ...res.body.result.startingPositionsSnapshot,
        ...res.body.result.endingPositionsSnapshot
      ]
      const periodsBalances = [
        res.body.result.finalState.startingPeriodBalances,
        res.body.result.finalState.endingPeriodBalances
      ]

      positions.forEach((item) => {
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
      periodsBalances.forEach((item) => {
        const {
          walletsTotalBalanceUsd,
          positionsTotalPlUsd,
          totalResult
        } = item

        assert.isNumber(walletsTotalBalanceUsd)
        assert.isNumber(positionsTotalPlUsd)
        assert.isNumber(totalResult)
      })
      res.body.result.finalState.movements.forEach((item) => {
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
      })
    }
  })

  it('it should be successfully performed by the getTransactionTaxReport method, LIFO strategy', async function () {
    this.timeout(60000)

    const res = await agent
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

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.isArray(res.body.result.taxes)
    assert.isArray(res.body.result.delistedCcyList)
    assert.isAtLeast(res.body.result.taxes.length, 1)
    assert.lengthOf(res.body.result.delistedCcyList, 0)

    res.body.result.taxes.forEach((item) => {
      assert.isObject(item)
      assert.containsAllKeys(item, [
        'asset',
        'amount',
        'mtsAcquired',
        'mtsSold',
        'proceeds',
        'cost',
        'gainOrLoss',
        'type'
      ])
    })
  })

  it('it should be successfully performed by the getTransactionTaxReport method, FIFO strategy', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTransactionTaxReport',
        params: {
          end,
          start: start + (45 * 24 * 60 * 60 * 1000),
          strategy: 'FIFO'
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.isArray(res.body.result.taxes)
    assert.isArray(res.body.result.delistedCcyList)
    assert.isAtLeast(res.body.result.taxes.length, 1)
    assert.lengthOf(res.body.result.delistedCcyList, 0)

    res.body.result.taxes.forEach((item) => {
      assert.isObject(item)
      assert.containsAllKeys(item, [
        'asset',
        'amount',
        'mtsAcquired',
        'mtsSold',
        'proceeds',
        'cost',
        'gainOrLoss',
        'type'
      ])
    })
  })

  it('it should be successfully performed by the getTradedVolume method', async function () {
    this.timeout(60000)

    const paramsArr = getParamsArrToTestTimeframeGrouping({ start, end })

    for (const params of paramsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth,
          method: 'getTradedVolume',
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

  it('it should be successfully performed by the getTotalFeesReport method', async function () {
    this.timeout(60000)

    const paramsArr = getParamsArrToTestTimeframeGrouping({
      start,
      end,
      isTradingFees: true,
      isFundingFees: true
    })

    for (const params of paramsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth,
          method: 'getTotalFeesReport',
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
        'cumulative',
        'USD'
      ])
    }
  })

  it('it should not be successfully performed by the getTotalFeesReport method', async function () {
    this.timeout(60000)

    const paramsArr = getParamsArrToTestTimeframeGrouping({ start, end })

    for (const params of paramsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth,
          method: 'getTotalFeesReport',
          params,
          id: 5
        })
        .expect('Content-Type', /json/)
        .expect(400)

      assert.isObject(res.body)
      assert.isObject(res.body.error)
      assert.propertyVal(res.body.error, 'code', 400)
      assert.propertyVal(res.body.error, 'message', 'Args params is not valid')
      assert.propertyVal(res.body, 'id', 5)
    }
  })

  it('it should be successfully performed by the getPerformingLoan method', async function () {
    this.timeout(60000)

    const paramsArr = getParamsArrToTestTimeframeGrouping({ start, end })

    for (const params of paramsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth,
          method: 'getPerformingLoan',
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
        'cumulative',
        'perc'
      ])
    }
  })

  it('it should be successfully performed by the getWinLossVSAccountBalance method', async function () {
    this.timeout(120000)

    const paramsArr = getParamsArrToTestTimeframeGrouping({ start, end })

    for (const params of paramsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth,
          method: 'getWinLossVSAccountBalance',
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
        'perc'
      ])
    }
  })

  it('it should be successfully performed by the getWeightedAveragesReport method', async function () {
    this.timeout(120000)

    const paramsArr = [
      { end, start, symbol: 'tBTCUSD' },
      {
        end,
        start: end - (10 * 60 * 60 * 1000),
        symbol: ['tBTCUSD']
      }
    ]

    for (const params of paramsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth,
          method: 'getWeightedAveragesReport',
          params,
          id: 5
        })
        .expect('Content-Type', /json/)
        .expect(200)

      assert.isObject(res.body)
      assert.propertyVal(res.body, 'id', 5)
      assert.isObject(res.body.result)
      assert.isArray(res.body.result.res)
      assert.isBoolean(res.body.result.nextPage)

      const resItem = res.body.result.res[0]

      assert.isObject(resItem)
      assert.containsAllKeys(resItem, [
        'symbol',
        'buyingWeightedPrice',
        'buyingAmount',
        'cost',
        'sellingWeightedPrice',
        'sellingAmount',
        'sale',
        'cumulativeAmount',
        'firstTradeMts',
        'lastTradeMts'
      ])
    }
  })

  it('it should be successfully performed by the getMultipleFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getMultipleFile',
        params: {
          email,
          isPDFRequired,
          multiExport: [
            {
              method: 'getTradesFile',
              symbol: ['tBTCUSD', 'tETHUSD'],
              end,
              start,
              limit: 1000,
              timezone: 'America/Los_Angeles'
            },
            {
              method: 'getBalanceHistoryFile',
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getBalanceHistoryFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getBalanceHistoryFile',
        params: {
          isPDFRequired,
          end,
          start,
          timeframe: 'day',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getSummaryByAsset method', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getSummaryByAsset',
        params: {
          start,
          end
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.isArray(res.body.result.summaryByAsset)
    assert.isObject(res.body.result.total)

    res.body.result.summaryByAsset.forEach((item) => {
      assert.isObject(item)
      assert.containsAllKeys(item, [
        'currency',
        'balance',
        'balanceUsd',
        'balanceChange',
        'balanceChangePerc',
        'volume',
        'volumeUsd',
        'tradingFees',
        'marginFundingPayment'
      ])
    })

    assert.containsAllKeys(res.body.result.total, [
      'balanceUsd',
      'balanceChangeUsd',
      'balanceChangePerc',
      'volumeUsd',
      'tradingFeesUsd'
    ])
  })

  it('it should be successfully performed by the getSummaryByAsset method, 30d period until the end point', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getSummaryByAsset',
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
    assert.isArray(res.body.result.summaryByAsset)
    assert.isObject(res.body.result.total)

    res.body.result.summaryByAsset.forEach((item) => {
      assert.isObject(item)
      assert.containsAllKeys(item, [
        'currency',
        'balance',
        'balanceUsd',
        'balanceChange',
        'balanceChangePerc',
        'volume',
        'volumeUsd',
        'tradingFees',
        'marginFundingPayment'
      ])
    })

    assert.containsAllKeys(res.body.result.total, [
      'balanceUsd',
      'balanceChangeUsd',
      'balanceChangePerc',
      'volumeUsd',
      'tradingFeesUsd'
    ])
  })

  it('it should not be successfully performed by the getSummaryByAsset method', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getSummaryByAsset',
        params: {
          end: 'not integer'
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

  it('it should be successfully performed by the getWinLossFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getWinLossFile',
        params: {
          isPDFRequired,
          end,
          start,
          timeframe: 'day',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getFullSnapshotReportFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFullSnapshotReportFile',
        params: {
          isPDFRequired,
          end,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getFullSnapshotReportFile method, store report file to local folder', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFullSnapshotReportFile',
        params: {
          isPDFRequired,
          end
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(
      procPromise,
      aggrPromise,
      res,
      testReportPathHasCommonFolder
    )
  })

  it('it should be successfully performed by the getPositionsSnapshotFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPositionsSnapshotFile',
        params: {
          isPDFRequired,
          end,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getFullTaxReportFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFullTaxReportFile',
        params: {
          isPDFRequired,
          end,
          start,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getFullTaxReportFile method, store report file to local folder', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFullTaxReportFile',
        params: {
          isPDFRequired,
          end,
          start
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(
      procPromise,
      aggrPromise,
      res,
      testReportPathHasCommonFolder
    )
  })

  it('it should be successfully performed by the getFullTaxReportFile method for starting snapshot, store report file to local folder', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFullTaxReportFile',
        params: {
          isPDFRequired,
          end,
          start,
          isStartSnapshot: true
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(
      procPromise,
      aggrPromise,
      res,
      testReportPathHasCommonFolder
    )
  })

  it('it should be successfully performed by the getFullTaxReportFile method for ending snapshot, store report file to local folder', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFullTaxReportFile',
        params: {
          isPDFRequired,
          end,
          start,
          isEndSnapshot: true
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(
      procPromise,
      aggrPromise,
      res,
      testReportPathHasCommonFolder
    )
  })

  it('it should be successfully performed by the getTransactionTaxReportFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTransactionTaxReportFile',
        params: {
          isPDFRequired,
          end,
          start,
          strategy: 'LIFO',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getTradedVolumeFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTradedVolumeFile',
        params: {
          isPDFRequired,
          end,
          start,
          timeframe: 'day',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getTotalFeesReportFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTotalFeesReportFile',
        params: {
          isPDFRequired,
          end,
          start,
          timeframe: 'day',
          email,
          isTradingFees: true
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getPerformingLoanFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPerformingLoanFile',
        params: {
          isPDFRequired,
          end,
          start,
          timeframe: 'day',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getWinLossVSAccountBalanceFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getWinLossVSAccountBalanceFile',
        params: {
          isPDFRequired,
          end,
          start,
          timeframe: 'day',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getWeightedAveragesReportFile method', async function () {
    this.timeout(60000)

    // TODO: Wait for implementation of pdf template in the next release
    if (isPDFRequired) {
      this.skip()
    }

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getWeightedAveragesReportFile',
        params: {
          isPDFRequired,
          symbol: 'tBTCUSD',
          end,
          start,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the removeUser method with token', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'removeUser',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isBoolean(res.body.result)
    assert.isOk(res.body.result)
  })

  it('it should not be successfully performed by the verifyUser method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'verifyUser',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(401)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 401)
    assert.propertyVal(res.body.error, 'message', 'Unauthorized')
    assert.propertyVal(res.body, 'id', 5)
  })
}
