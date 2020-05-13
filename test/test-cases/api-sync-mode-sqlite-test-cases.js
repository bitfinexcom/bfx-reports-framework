'use strict'

const { assert } = require('chai')

const {
  queueToPromise,
  queueToPromiseMulti
} = require('bfx-report/test/helpers/helpers.core')
const {
  testMethodOfGettingCsv,
  testProcQueue
} = require('bfx-report/test/helpers/helpers.tests')

const { delay } = require('../helpers/helpers.core')
const { getMockData } = require('../helpers/helpers.mock-rest-v2')

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
    date,
    end,
    start
  } = params
  const auth = { token: '' }

  it('it should be successfully performed by the pingApi method', async function () {
    this.timeout(5000)

    const args = {
      method: 'pingApi',
      id: 5
    }
    const argsArr = [
      { ...args },
      {
        ...args,
        pingMethod: '_getPublicTrades',
        params: {
          limit: 1,
          notThrowError: true,
          notCheckNextPage: true
        }
      }
    ]

    for (const args of argsArr) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send(args)
        .expect('Content-Type', /json/)
        .expect(200)

      assert.isObject(res.body)
      assert.propertyVal(res.body, 'id', 5)
      assert.isOk(res.body.result)
    }
  })

  it('it should be successfully performed by the isSyncModeConfig method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        method: 'isSyncModeConfig',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isOk(res.body.result)
  })

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

  it('it should be successfully performed by the signIn method by token', async function () {
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
    assert.strictEqual(res.body.result.email, email)
    assert.strictEqual(res.body.result.isSubAccount, isSubAccount)
    assert.strictEqual(res.body.result.token, auth.token)
  })

  it('it should not be successfully performed by the signIn method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: {
          email,
          password: 'wrong-password',
          isSubAccount
        },
        method: 'signIn',
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

  it('it should not be successfully performed by the signIn method by token', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: { token: 'wrong-token' },
        method: 'signIn',
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

  it('it should not be successfully performed by the verifyUser method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: { token: 'wrong-token' },
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

  it('it should be successfully performed by the signOut method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'signOut',
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

  it('it should be successfully performed by the verifyUser method', async function () {
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
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.isNumber(res.body.result.id)
    assert.isString(res.body.result.username)
    assert.isString(res.body.result.timezone)
    assert.strictEqual(res.body.result.email, email)
    assert.strictEqual(res.body.result.isSubAccount, isSubAccount)
    assert.isArray(res.body.result.subUsers)

    res.body.result.subUsers.forEach((subUser) => {
      assert.isObject(subUser)
      assert.isNumber(subUser.id)
      assert.isString(subUser.username)
      assert.isString(subUser.timezone)
      assert.isString(subUser.email)
      assert.isBoolean(subUser.isSubAccount)
      assert.isNotOk(subUser.isSubAccount)
    })
  })

  it('it should be successfully performed by the getUsers method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        method: 'getUsers',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isArray(res.body.result)

    res.body.result.forEach((user) => {
      assert.isObject(user)
      assert.isString(user.email)
      assert.isBoolean(user.isSubAccount)
    })
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

  it('it should be successfully performed by the isSchedulerEnabled method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        method: 'isSchedulerEnabled',
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

  it('it should be successfully performed by the editPublicTradesConf method, where an object is passed', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'editPublicTradesConf',
        params: {
          start,
          symbol: 'tIOTUSD'
        },
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
          },
          {
            start,
            symbol: 'tETHUSD'
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

  it('it should be successfully performed by the getPublicTradesConf method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPublicTradesConf',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isArray(res.body.result)
    assert.equal(res.body.result.length, 2)

    assert.isObject(res.body.result[0])
    assert.propertyVal(res.body.result[0], 'symbol', 'tBTCUSD')
    assert.propertyVal(res.body.result[0], 'start', start)

    assert.isObject(res.body.result[1])
    assert.propertyVal(res.body.result[1], 'symbol', 'tETHUSD')
    assert.propertyVal(res.body.result[1], 'start', start)
  })

  it('it should be successfully performed by the editTickersHistoryConf method, where an object is passed', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'editTickersHistoryConf',
        params: {
          start,
          symbol: 'USD'
        },
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
          },
          {
            start,
            symbol: 'ETH'
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

  it('it should be successfully performed by the getTickersHistoryConf method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTickersHistoryConf',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isArray(res.body.result)
    assert.equal(res.body.result.length, 2)

    assert.isObject(res.body.result[0])
    assert.propertyVal(res.body.result[0], 'symbol', 'BTC')
    assert.propertyVal(res.body.result[0], 'start', start)

    assert.isObject(res.body.result[1])
    assert.propertyVal(res.body.result[1], 'symbol', 'ETH')
    assert.propertyVal(res.body.result[1], 'start', start)
  })

  it('it should be successfully performed by the editStatusMessagesConf method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'editStatusMessagesConf',
        params: [
          {
            start,
            symbol: 'tBTCF0:USTF0'
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

  it('it should be successfully performed by the getStatusMessagesConf method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getStatusMessagesConf',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isArray(res.body.result)
    assert.equal(res.body.result.length, 1)

    assert.isObject(res.body.result[0])
    assert.propertyVal(res.body.result[0], 'symbol', 'tBTCF0:USTF0')
    assert.propertyVal(res.body.result[0], 'start', start)
  })

  it('it should be successfully performed by the editCandlesConf method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'editCandlesConf',
        params: [
          {
            start,
            symbol: 'tBTCUSD',
            timeframe: '12h'
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

  it('it should be successfully performed by the getCandlesConf method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getCandlesConf',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isArray(res.body.result)
    assert.equal(res.body.result.length, 1)

    assert.isObject(res.body.result[0])
    assert.propertyVal(res.body.result[0], 'symbol', 'tBTCUSD')
    assert.propertyVal(res.body.result[0], 'timeframe', '12h')
    assert.propertyVal(res.body.result[0], 'start', start)
  })

  it('it should be successfully performed by the editAllPublicСollsСonfs method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'editAllPublicСollsСonfs',
        params: {
          publicTradesConf: [
            {
              start,
              symbol: 'tBTCUSD'
            },
            {
              start,
              symbol: 'tETHUSD'
            }
          ],
          tickersHistoryConf: [
            {
              start,
              symbol: 'BTC'
            },
            {
              start,
              symbol: 'ETH'
            }
          ],
          statusMessagesConf: [
            {
              start,
              symbol: 'tBTCF0:USTF0'
            }
          ],
          candlesConf: [
            {
              start,
              symbol: 'tBTCUSD',
              timeframe: '12h'
            }
          ]
        },
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

  it('it should be successfully performed by the getAllPublicСollsСonfs method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getAllPublicСollsСonfs',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)

    assert.isArray(res.body.result.publicTradesConf)
    assert.equal(res.body.result.publicTradesConf.length, 2)
    assert.isObject(res.body.result.publicTradesConf[0])
    assert.propertyVal(res.body.result.publicTradesConf[0], 'symbol', 'tBTCUSD')
    assert.propertyVal(res.body.result.publicTradesConf[0], 'start', start)
    assert.isObject(res.body.result.publicTradesConf[1])
    assert.propertyVal(res.body.result.publicTradesConf[1], 'symbol', 'tETHUSD')
    assert.propertyVal(res.body.result.publicTradesConf[1], 'start', start)

    assert.isArray(res.body.result.tickersHistoryConf)
    assert.equal(res.body.result.tickersHistoryConf.length, 2)
    assert.isObject(res.body.result.tickersHistoryConf[0])
    assert.propertyVal(res.body.result.tickersHistoryConf[0], 'symbol', 'BTC')
    assert.propertyVal(res.body.result.tickersHistoryConf[0], 'start', start)
    assert.isObject(res.body.result.tickersHistoryConf[1])
    assert.propertyVal(res.body.result.tickersHistoryConf[1], 'symbol', 'ETH')
    assert.propertyVal(res.body.result.tickersHistoryConf[1], 'start', start)

    assert.isArray(res.body.result.statusMessagesConf)
    assert.equal(res.body.result.statusMessagesConf.length, 1)
    assert.isObject(res.body.result.statusMessagesConf[0])
    assert.propertyVal(res.body.result.statusMessagesConf[0], 'symbol', 'tBTCF0:USTF0')
    assert.propertyVal(res.body.result.statusMessagesConf[0], 'start', start)

    assert.isArray(res.body.result.candlesConf)
    assert.equal(res.body.result.candlesConf.length, 1)
    assert.isObject(res.body.result.candlesConf[0])
    assert.propertyVal(res.body.result.candlesConf[0], 'symbol', 'tBTCUSD')
    assert.propertyVal(res.body.result.candlesConf[0], 'timeframe', '12h')
    assert.propertyVal(res.body.result.candlesConf[0], 'start', start)
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

  it('it should be successfully performed by the isSyncModeWithDbData method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'isSyncModeWithDbData',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isOk(res.body.result)
  })

  it('it should be successfully check, csv is stored locally', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/check-stored-locally`)
      .type('json')
      .send({
        auth,
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.isString(res.body.result)
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should be successfully performed by the getUsersTimeConf method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getUsersTimeConf',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isString(res.body.result.timezoneName)
    assert.isNumber(res.body.result.timezoneOffset)
  })

  it('it should be successfully performed by the getSymbols method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getSymbols',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.isArray(res.body.result.pairs)
    assert.isArray(res.body.result.currencies)
    assert.lengthOf(res.body.result.pairs, 13)
    assert.lengthOf(res.body.result.currencies, 11)

    res.body.result.pairs.forEach(item => {
      assert.isString(item)
    })
    res.body.result.currencies.forEach(item => {
      assert.isObject(item)
      assert.isString(item.id)
      assert.isString(item.name)
    })
  })

  it('it should be successfully performed by the getTickersHistory method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTickersHistory',
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
      'symbol',
      'bid',
      'bidPeriod',
      'ask',
      'mtsUpdate'
    ])
  })

  it('it should be successfully performed by the getPositionsHistory method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPositionsHistory',
        params: {
          symbol: 'tBTCUSD',
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
      'symbol',
      'status',
      'amount',
      'basePrice',
      'closePrice',
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
  })

  it('it should be successfully performed by the getPositionsAudit method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPositionsAudit',
        params: {
          id: [12345],
          symbol: 'tBTCUSD',
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
    assert.isOk(
      typeof res.body.result.nextPage === 'boolean' ||
      Number.isInteger(res.body.result.nextPage)
    )

    const resItem = res.body.result.res[0]

    assert.isObject(resItem)
    assert.containsAllKeys(resItem, [
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
      'mtsUpdate'
    ])
  })

  it('it should be successfully performed by the getWallets method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
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

  it('it should be successfully performed by the getWallets method, without params', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getWallets',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isArray(res.body.result)

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
    })
  })

  it('it should be successfully performed by the getFundingOfferHistory method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFundingOfferHistory',
        params: {
          symbol: 'fUSD',
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
  })

  it('it should be successfully performed by the getFundingLoanHistory method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFundingLoanHistory',
        params: {
          symbol: 'fUSD',
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
  })

  it('it should be successfully performed by the getFundingCreditHistory method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFundingCreditHistory',
        params: {
          symbol: 'fUSD',
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
  })

  it('it should be successfully performed by the getLedgers method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
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

  it('it should be successfully performed by the getLedgers method, without params', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getLedgers',
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
  })

  it('it should be successfully performed by the getTrades method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTrades',
        params: {
          symbol: 'tBTCUSD',
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
  })

  it('it should be successfully performed by the getTrades method, where the symbol is an array', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTrades',
        params: {
          symbol: ['tBTCUSD', 'tETHUSD'],
          start: 0,
          end,
          limit: 10
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
  })

  it('it should be successfully performed by the getTrades method, where the symbol is an array with length equal to one', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTrades',
        params: {
          symbol: ['tBTCUSD'],
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
  })

  it('it should be successfully performed by the getFundingTrades method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFundingTrades',
        params: {
          symbol: 'fBTC',
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
      'symbol',
      'mtsCreate',
      'offerID',
      'amount',
      'rate',
      'period',
      'maker'
    ])
  })

  it('it should be successfully performed by the getPublicTrades method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPublicTrades',
        params: {
          symbol: 'tBTCUSD',
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
      'mts',
      'amount',
      'price'
    ])
  })

  it('it should be successfully performed by the getPublicTrades method, with not synced symbol', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPublicTrades',
        params: {
          symbol: 'tEOSEUR',
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
    assert.isBoolean(res.body.result.nextPage)

    const resItem = res.body.result.res[0]

    assert.isObject(resItem)
    assert.containsAllKeys(resItem, [
      'id',
      'mts',
      'amount',
      'price'
    ])
  })

  it('it should be successfully performed by the getPublicTrades method, where the symbol is an array with length equal to one', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPublicTrades',
        params: {
          symbol: ['tBTCUSD'],
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
      'mts',
      'amount',
      'price'
    ])
  })

  it('it should not be successfully performed by the getPublicTrades method, where the symbol is an array with length more then one', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPublicTrades',
        params: {
          symbol: ['tBTCUSD', 'tETHUSD'],
          start: 0,
          end,
          limit: 2
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(500)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 500)
    assert.propertyVal(res.body.error, 'message', 'Internal Server Error')
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should be successfully performed by the getStatusMessages method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getStatusMessages',
        params: {
          symbol: 'tBTCF0:USTF0'
        },
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
      'key',
      'timestamp',
      'price',
      'priceSpot',
      'fundBal',
      'fundingAccrued',
      'fundingStep'
    ])
  })

  it('it should be successfully performed by the getCandles method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getCandles',
        params: {
          symbol: 'tBTCUSD',
          timeframe: '12h'
        },
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
      'mts',
      'open',
      'close',
      'high',
      'low',
      'volume'
    ])
  })

  it('it should be returned from api_v2 by the getCandles method, with not synced symbol', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getCandles',
        params: {
          symbol: 'tEOSEUR',
          timeframe: '1h'
        },
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
      'mts',
      'open',
      'close',
      'high',
      'low',
      'volume'
    ])
  })

  it('it should be successfully performed by the getOrderTrades method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getOrderTrades',
        params: {
          id: 12345,
          symbol: 'tBTCUSD',
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

    /**
     * it should be a boolean because in the DB is contained
     * one a row with id=12345
     */
    assert.isBoolean(res.body.result.nextPage)

    const resItem = res.body.result.res[0]

    assert.isObject(resItem)
    assert.containsAllKeys(resItem, [
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
  })

  it('it should not be successfully performed by the getOrderTrades method, where the symbol is an array', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getOrderTrades',
        params: {
          id: 12345,
          symbol: ['tBTCUSD', 'tETHUSD'],
          start: 0,
          end,
          limit: 2
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(500)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 500)
    assert.propertyVal(res.body.error, 'message', 'Internal Server Error')
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should be successfully performed by the getOrderTrades method, where the symbol is an array with length equal to one', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getOrderTrades',
        params: {
          id: 12345,
          symbol: ['tBTCUSD'],
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

    /**
     * it should be a boolean because in the DB is contained
     * one a row with id=12345
     */
    assert.isBoolean(res.body.result.nextPage)

    const resItem = res.body.result.res[0]

    assert.isObject(resItem)
    assert.containsAllKeys(resItem, [
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
  })

  it('it should be successfully performed by the getOrders method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getOrders',
        params: {
          symbol: 'tBTCUSD',
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
      'gid',
      'cid',
      'symbol',
      'mtsCreate',
      'mtsUpdate',
      'amount',
      'amountOrig',
      'type',
      'typePrev',
      'flags',
      'status',
      'price',
      'priceAvg',
      'priceTrailing',
      'priceAuxLimit',
      'notify',
      'placedId',
      'amountExecuted'
    ])
  })

  it('it should be successfully performed by the getActiveOrders method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getActiveOrders',
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
      'id',
      'gid',
      'cid',
      'symbol',
      'mtsCreate',
      'mtsUpdate',
      'amount',
      'amountOrig',
      'type',
      'typePrev',
      'flags',
      'status',
      'price',
      'priceAvg',
      'priceTrailing',
      'priceAuxLimit',
      'notify',
      'placedId',
      'amountExecuted'
    ])
  })

  it('it should be successfully performed by the getMovements method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getMovements',
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

  it('it should be successfully performed by the getMovements method, without params', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getMovements',
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

  it('it should not be successfully performed by the getMovements method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getMovements',
        params: 'isNotObject',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(500)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 500)
    assert.propertyVal(res.body.error, 'message', 'Internal Server Error')
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should be successfully performed by the getLogins method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getLogins',
        params: {
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
      'time',
      'ip',
      'extraData'
    ])
    assert.isObject(resItem.extraData)
  })

  it('it should not be successfully performed by the getLedgers method, a greater limit is needed', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getLedgers',
        params: {
          symbol: 'BTC',
          start: 0,
          end,
          limit: 1
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(400)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 400)
    assert.propertyVal(res.body.error, 'message', 'A greater limit is needed as to show the data correctly')
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should be successfully performed by the getMovements method, without MinLimitParamError error', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getMovements',
        params: {
          symbol: 'BTC',
          start: 0,
          end,
          limit: 25
        },
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

  it('it should not be successfully performed by a fake method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'fake',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(500)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 500)
    assert.propertyVal(res.body.error, 'message', 'Internal Server Error')
    assert.propertyVal(res.body, 'id', 5)
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
              method: 'getTickersHistoryCsv',
              symbol: 'BTC',
              end,
              start,
              limit: 1000
            }
          ]
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should not be successfully performed by the getMultipleCsv method', async function () {
    this.timeout(60000)

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
              symbol: ['tBTCUSD', 'tETHUSD'],
              end,
              start,
              limit: 1000,
              timezone: 'America/Los_Angeles'
            }
          ]
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(500)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 500)
    assert.propertyVal(res.body.error, 'message', 'Internal Server Error')
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should be successfully performed by the getTickersHistoryCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTickersHistoryCsv',
        params: {
          symbol: 'BTC',
          end,
          start,
          limit: 1000,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getPositionsHistoryCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPositionsHistoryCsv',
        params: {
          symbol: 'tBTCUSD',
          end,
          start,
          limit: 1000,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getPositionsAuditCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPositionsAuditCsv',
        params: {
          id: [12345],
          symbol: 'tBTCUSD',
          end,
          start,
          limit: 1000,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getWalletsCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getWalletsCsv',
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

  it('it should be successfully performed by the getFundingOfferHistoryCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFundingOfferHistoryCsv',
        params: {
          symbol: 'fUSD',
          end,
          start,
          limit: 1000,
          email,
          milliseconds: true
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getFundingLoanHistoryCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFundingLoanHistoryCsv',
        params: {
          symbol: 'fUSD',
          end,
          start,
          limit: 1000,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getFundingCreditHistoryCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFundingCreditHistoryCsv',
        params: {
          symbol: 'fUSD',
          end,
          start,
          limit: 1000,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getLedgersCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

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
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getTradesCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTradesCsv',
        params: {
          symbol: ['tBTCUSD', 'tETHUSD'],
          end,
          start,
          limit: 1000,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getFundingTradesCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFundingTradesCsv',
        params: {
          symbol: ['fBTC', 'fETH'],
          end,
          start,
          limit: 1000,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getPublicTradesCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPublicTradesCsv',
        params: {
          symbol: 'tBTCUSD',
          end,
          start: (new Date()).setDate(date.getDate() - 27),
          limit: 1000,
          timezone: 'America/Los_Angeles',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should not be successfully performed by the getPublicTradesCsv method, time frame more then a month', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPublicTradesCsv',
        params: {
          symbol: 'tBTCUSD',
          end,
          start,
          limit: 1000,
          timezone: 'America/Los_Angeles',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(400)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 400)
    assert.propertyVal(res.body.error, 'message', 'For public trades export please select a time frame smaller than a month')
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should not be successfully performed by the getPublicTradesCsv method, with symbol array', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPublicTradesCsv',
        params: {
          symbol: ['tBTCUSD', 'tETHUSD'],
          end,
          start,
          limit: 1000,
          timezone: 'America/Los_Angeles',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(500)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 500)
    assert.propertyVal(res.body.error, 'message', 'Internal Server Error')
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should be successfully performed by the getStatusMessagesCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getStatusMessagesCsv',
        params: {
          symbol: ['tBTCF0:USTF0'],
          timezone: 'America/Los_Angeles',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getCandlesCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getCandlesCsv',
        params: {
          symbol: 'tBTCUSD',
          timeframe: '12h',
          end,
          start: (new Date()).setDate(date.getDate() - 27),
          limit: 1000,
          timezone: 'America/Los_Angeles',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getOrderTradesCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getOrderTradesCsv',
        params: {
          id: 12345,
          symbol: 'tBTCUSD',
          end,
          start,
          limit: 1000,
          timezone: 'America/Los_Angeles',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getOrdersCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getOrdersCsv',
        params: {
          symbol: 'tBTCUSD',
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

  it('it should be successfully performed by the getActiveOrdersCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getActiveOrdersCsv',
        params: {
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getMovementsCsv method', async function () {
    this.timeout(3 * 60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getMovementsCsv',
        params: {
          symbol: 'BTC',
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

  it('it should be successfully performed by the getMovementsCsv method, where amount > 0', async function () {
    this.timeout(3 * 60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getMovementsCsv',
        params: {
          symbol: 'BTC',
          end,
          start,
          email,
          isDeposits: true
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getMovementsCsv method, where amount < 0', async function () {
    this.timeout(3 * 60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getMovementsCsv',
        params: {
          symbol: 'BTC',
          end,
          start,
          email,
          isWithdrawals: true
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getLoginsCsv method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getLoginsCsv',
        params: {
          end,
          start,
          limit: 1000,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingCsv(procPromise, aggrPromise, res)
  })

  it('it should not be successfully auth by the getLedgersCsv method', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        method: 'getLedgersCsv',
        params: {
          symbol: 'BTC',
          end,
          start,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(401)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.error)
    assert.containsAllKeys(res.body.error, [
      'code',
      'message'
    ])
  })

  it('it should be successfully performed by the getLedgersCsv method, with multiple users', async function () {
    this.timeout(5 * 60000)

    const count = 10
    const procPromise = queueToPromiseMulti(
      params.processorQueue,
      count,
      testProcQueue
    )
    const aggrPromise = queueToPromiseMulti(params.aggregatorQueue, count)

    for (let i = 0; i < count; i += 1) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth,
          method: 'getLedgersCsv',
          params: {
            symbol: 'BTC',
            end,
            start,
            email
          },
          id: 5
        })
        .expect('Content-Type', /json/)
        .expect(200)

      assert.isObject(res.body)
      assert.propertyVal(res.body, 'id', 5)
      assert.isObject(res.body.result)
      assert.isOk(res.body.result.isSendEmail || res.body.result.isSaveLocaly)
    }

    await procPromise
    await aggrPromise
  })

  it('it should be successfully performed by the disableScheduler method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'disableScheduler',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isOk(res.body.result)
  })

  it('it should be successfully performed by the isSchedulerEnabled method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        method: 'isSchedulerEnabled',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isNotOk(res.body.result)
  })

  it('it should be successfully performed by the getSyncProgress method', async function () {
    this.timeout(60000)

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
    assert.isNotOk(res.body.result)
  })

  it('it should be successfully performed by the disableSyncMode method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'disableSyncMode',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isOk(res.body.result)
  })

  it('it should be successfully performed by the isSyncModeWithDbData method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'isSyncModeWithDbData',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isNotOk(res.body.result)
  })

  it('it should be successfully performed by the removeUser method', async function () {
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
