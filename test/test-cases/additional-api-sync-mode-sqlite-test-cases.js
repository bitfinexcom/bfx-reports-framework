'use strict'

const { assert } = require('chai')

const {
  queueToPromise
} = require('bfx-report/test/helpers/helpers.core')
const {
  testMethodOfGettingCsv
} = require('bfx-report/test/helpers/helpers.tests')

const {
  delay,
  getParamsArrToTestTimeframeGrouping
} = require('../helpers/helpers.core')

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
    start
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
    assert.isOk(
      typeof res.body.result === 'string' ||
      typeof res.body.result === 'number'
    )
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

  it('it should be successfully performed by the getFeesReport method', async function () {
    this.timeout(60000)

    const paramsArr = getParamsArrToTestTimeframeGrouping({ start, end })

    for (const params of paramsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth,
          method: 'getFeesReport',
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

  it('it should be successfully performed by the getMultipleCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
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

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
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

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
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

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
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

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
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

  it('it should be successfully performed by the getFullTaxReportCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFullTaxReportCsv',
        params: {
          end,
          start,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getTradedVolumeCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTradedVolumeCsv',
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

  it('it should be successfully performed by the getFeesReportCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFeesReportCsv',
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

  it('it should be successfully performed by the getPerformingLoanCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPerformingLoanCsv',
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
}
