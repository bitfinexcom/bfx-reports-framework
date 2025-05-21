'use strict'

const { assert } = require('chai')

const {
  queueToPromise,
  queueToPromiseMulti
} = require('bfx-report/test/helpers/helpers.core')
const {
  testMethodOfGettingReportFile,
  testProcQueue
} = require('bfx-report/test/helpers/helpers.tests')

const getSyncProgressTestCase = require('./get-sync-progress-test-case')
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
    start,
    isPDFRequired
  } = params
  const auth = { token: '' }

  it('it should be successfully performed by the isStagingBfxApi method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        method: 'isStagingBfxApi',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isBoolean(res.body.result)
  })

  it('it should be successfully performed by the getPlatformStatus method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        method: 'getPlatformStatus',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.isBoolean(res.body.result.isMaintenance)
    assert.isNotOk(res.body.result.isMaintenance)
  })

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

  it('it should be successfully performed by the loginToBFX method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: {
          login: 'user-name',
          password: 'user-pwd'
        },
        method: 'loginToBFX',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isArray(res.body.result)
    assert.isString(res.body.result[0])
    assert.isArray(res.body.result[1])
    assert.isArray(res.body.result[1][0])
    assert.isString(res.body.result[1][0][0])
    assert.isBoolean(res.body.result[1][0][1])
  })

  it('it should be successfully performed by the verifyOnBFX method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: {
          loginToken: '12345678-8888-4321-1234-8cb090a01360',
          token: '123456',
          verifyMethod: 'otp'
        },
        method: 'verifyOnBFX',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isArray(res.body.result)
    assert.isString(res.body.result[0])
    assert.isString(res.body.result[1])
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
    assert.isBoolean(res.body.result.shouldNotSyncOnStartupAfterUpdate)
    assert.isNotOk(res.body.result.shouldNotSyncOnStartupAfterUpdate)
    assert.isNull(res.body.result.authTokenTTLSec)
    assert.isNull(res.body.result.localUsername)
    assert.isNull(res.body.result.lastSyncMts)
    assert.isBoolean(res.body.result.isStagingBfxApi)
    assert.isBoolean(res.body.result.isUserMerchant)

    auth.token = res.body.result.token
  })

  it('it should be successfully performed by the updateUser method for shouldNotSyncOnStartupAfterUpdate field', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'updateUser',
        params: {
          shouldNotSyncOnStartupAfterUpdate: true
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isBoolean(res.body.result)
    assert.isOk(res.body.result)
  })

  it('it should be successfully performed by the updateUser method for authTokenTTLSec field', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'updateUser',
        params: {
          authTokenTTLSec: 7 * 24 * 60 * 60
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isBoolean(res.body.result)
    assert.isOk(res.body.result)
  })

  it('it should not be successfully performed by the updateUser method for authTokenTTLSec field', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'updateUser',
        params: {
          authTokenTTLSec: 8 * 24 * 60 * 60
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(400)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 400)
    assert.propertyVal(res.body.error, 'message', 'Auth token TTL has been set to disallowed value')
    assert.propertyVal(res.body, 'id', 5)
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
    assert.isBoolean(res.body.result.shouldNotSyncOnStartupAfterUpdate)
    assert.isOk(res.body.result.shouldNotSyncOnStartupAfterUpdate)
    assert.isNumber(res.body.result.authTokenTTLSec)
    assert.isNull(res.body.result.localUsername)
    assert.isNull(res.body.result.lastSyncMts)
    assert.isBoolean(res.body.result.isStagingBfxApi)
    assert.isBoolean(res.body.result.isUserMerchant)
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
    assert.isObject(res.body.error.data)
    assert.propertyVal(res.body, 'id', 5)
    assert.isString(res.body.jsonrpc)
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
    assert.isBoolean(res.body.result.isUserMerchant)
    assert.isArray(res.body.result.subUsers)

    res.body.result.subUsers.forEach((subUser) => {
      assert.isObject(subUser)
      assert.isNumber(subUser.id)
      assert.isString(subUser.username)
      assert.isString(subUser.timezone)
      assert.isString(subUser.email)
      assert.isBoolean(subUser.isSubAccount)
      assert.isNotOk(subUser.isSubAccount)
      assert.isBoolean(subUser.isUserMerchant)
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
      assert.isBoolean(user.isNotProtected)
      assert.isBoolean(user.isRestrictedToBeAddedToSubAccount)
      assert.isBoolean(user.isApiKeysAuth)
      assert.isArray(user.subUsers)
      assert.isBoolean(user.isStagingBfxApi)

      user.subUsers.forEach((subUser) => {
        assert.isString(subUser.email)
      })
    })
  })

  it('it should be successfully performed by the haveCollsBeenSyncedAtLeastOnce method, returns false', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'haveCollsBeenSyncedAtLeastOnce',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isBoolean(res.body.result)
    assert.isNotOk(res.body.result)
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

  it('it should be successfully performed by the getLastFinishedSyncMts method, lastSyncMts is integer', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getLastFinishedSyncMts',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.isOk(Number.isInteger(res.body.result.lastSyncMts))
  })

  it('it should be successfully performed by the haveCollsBeenSyncedAtLeastOnce method, returns true', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'haveCollsBeenSyncedAtLeastOnce',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isBoolean(res.body.result)
    assert.isOk(res.body.result)
  })

  it('it should be successfully performed by the editAllPublicCollsConfs method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'editAllPublicCollsConfs',
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
    assert.isBoolean(res.body.result)
    assert.isOk(res.body.result)
  })

  getSyncProgressTestCase(agent, { basePath, auth })

  it('it should be successfully performed by the getAllPublicCollsConfs method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getAllPublicCollsConfs',
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

  it('it should be successfully performed by the stopSyncNow method', async function () {
    this.timeout(60000)

    const syncNowRes = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'syncNow',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(syncNowRes.body)
    assert.propertyVal(syncNowRes.body, 'id', 5)
    assert.isOk(
      Number.isInteger(syncNowRes.body.result) ||
      (
        typeof syncNowRes.body.result === 'string' &&
        syncNowRes.body.result === 'SYNCHRONIZATION_IS_STARTED'
      )
    )

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'stopSyncNow',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isOk(
      (
        Number.isInteger(res.body.result) &&
        res.body.result < 100
      ) ||
      (
        typeof res.body.result === 'string' &&
        res.body.result === 'SYNCHRONIZATION_HAS_NOT_BEEN_STARTED_TO_INTERRUPT'
      )
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

  getSyncProgressTestCase(agent, { basePath, auth })

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

  it('it should be successfully performed by the updateSettings method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'updateSettings',
        params: {
          settings: { 'api:testKey': { value: 'strVal' } }
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isArray(res.body.result)
    assert.isNumber(res.body.result[0])
    assert.isString(res.body.result[1])
    assert.strictEqual(res.body.result[1], 'acc_ss')
    assert.isArray(res.body.result[4])
    assert.isNumber(res.body.result[4][0])
    assert.strictEqual(res.body.result[4][0], 1)
    assert.isString(res.body.result[6])
    assert.strictEqual(res.body.result[6], 'SUCCESS')
  })

  it('it should be successfully performed by the getSettings method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getSettings',
        params: {
          keys: ['api:testKey']
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isArray(res.body.result)
    assert.isArray(res.body.result[0])
    assert.isString(res.body.result[0][0])
    assert.strictEqual(res.body.result[0][0], 'testKey')
    assert.isObject(res.body.result[0][1])
    assert.isString(res.body.result[0][1].value)
    assert.strictEqual(res.body.result[0][1].value, 'strVal')
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
    assert.isArray(res.body.result.inactiveSymbols)
    assert.isArray(res.body.result.mapSymbols)
    assert.isArray(res.body.result.inactiveCurrencies)
    assert.isArray(res.body.result.marginCurrencyList)
    assert.lengthOf(res.body.result.pairs, 13)
    assert.lengthOf(res.body.result.currencies, 11)
    assert.lengthOf(res.body.result.inactiveSymbols, 2)
    assert.lengthOf(res.body.result.mapSymbols, 3)
    assert.lengthOf(res.body.result.inactiveCurrencies, 2)
    assert.lengthOf(res.body.result.marginCurrencyList, 4)

    res.body.result.pairs.forEach((item) => {
      assert.isString(item)
    })
    res.body.result.currencies.forEach((item) => {
      assert.isObject(item)
      assert.isString(item.id)
      assert.isString(item.name)
      assert.isBoolean(item.active)
      assert.isBoolean(item.isInPair)
      assert.isBoolean(item.isFunding)
    })
    res.body.result.inactiveSymbols.forEach((item) => {
      assert.isString(item)
    })
    res.body.result.mapSymbols.forEach((item) => {
      assert.lengthOf(item, 2)

      item.forEach((item) => {
        assert.isString(item)
      })
    })
    res.body.result.inactiveCurrencies.forEach((item) => {
      assert.isString(item)
    })
    res.body.result.marginCurrencyList.forEach((item) => {
      assert.isString(item)
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

  it('it should be successfully performed by the getPayInvoiceList method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPayInvoiceList',
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
      't',
      'duration',
      'amount',
      'currency',
      'orderId',
      'payCurrencies',
      'webhook',
      'redirectUrl',
      'status',
      'customerInfo',
      'invoices',
      'payment',
      'merchantName'
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
      .expect(400)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 400)
    assert.isObject(res.body.error.data)
    assert.isArray(res.body.error.data.errorMetadata)
    assert.isAbove(res.body.error.data.errorMetadata.length, 0)

    res.body.error.data.errorMetadata.forEach((item) => {
      assert.isObject(item)
    })

    assert.propertyVal(res.body.error, 'message', 'Args params is not valid')
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
      'fundingStep',
      'clampMin',
      'clampMax'
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
      .expect(400)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 400)
    assert.propertyVal(res.body.error, 'message', 'Args params is not valid')
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
      'amountExecuted',
      'routing',
      'meta'
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
      'transactionId',
      'note'
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
      'transactionId',
      'note'
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
      .expect(400)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 400)
    assert.propertyVal(res.body.error, 'message', 'Args params is not valid')
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should be successfully performed by the getMovementInfo method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getMovementInfo',
        params: {
          id: 12345
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)

    assert.containsAllKeys(res.body.result, [
      'id',
      'currency',
      'currencyName',
      'remark',
      'mtsStarted',
      'mtsUpdated',
      'status',
      'amount',
      'fees',
      'destinationAddress',
      'memo',
      'transactionId',
      'note',
      'bankFees',
      'bankRouterId',
      'externalBankMovId',
      'externalBankMovStatus',
      'externalBankMovDescription',
      'externalBankAccInfo'
    ])
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

  it('it should be successfully performed by the getChangeLogs method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getChangeLogs',
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
      'mtsCreate',
      'log',
      'ip',
      'userAgent'
    ])
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
      .expect(422)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 422)
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
      'transactionId',
      'note'
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
              method: 'getTickersHistoryFile',
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should not be successfully performed by the getMultipleFile method', async function () {
    this.timeout(60000)

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
      .expect(400)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 400)
    assert.propertyVal(res.body.error, 'message', 'Args params is not valid')
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should be successfully performed by the getTickersHistoryFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTickersHistoryFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getPositionsHistoryFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPositionsHistoryFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getPositionsAuditFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPositionsAuditFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getWalletsFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getWalletsFile',
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

  it('it should be successfully performed by the getFundingOfferHistoryFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFundingOfferHistoryFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getFundingLoanHistoryFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFundingLoanHistoryFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getFundingCreditHistoryFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFundingCreditHistoryFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getLedgersFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getLedgersFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getPayInvoiceListFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPayInvoiceListFile',
        params: {
          isPDFRequired,
          end,
          start,
          limit: 100,
          timezone: -3,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getTradesFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getTradesFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getFundingTradesFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getFundingTradesFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getPublicTradesFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPublicTradesFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should not be successfully performed by the getPublicTradesFile method, time frame more then a month', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPublicTradesFile',
        params: {
          isPDFRequired,
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
      .expect(422)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 422)
    assert.propertyVal(res.body.error, 'message', 'For public trades export please select a time frame smaller than a month')
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should not be successfully performed by the getPublicTradesFile method, with symbol array', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getPublicTradesFile',
        params: {
          isPDFRequired,
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
      .expect(400)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 400)
    assert.propertyVal(res.body.error, 'message', 'Args params is not valid')
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should be successfully performed by the getStatusMessagesFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getStatusMessagesFile',
        params: {
          isPDFRequired,
          symbol: ['tBTCF0:USTF0'],
          timezone: 'America/Los_Angeles',
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getCandlesFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getCandlesFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getOrderTradesFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getOrderTradesFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getOrdersFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getOrdersFile',
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

  it('it should be successfully performed by the getActiveOrdersFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getActiveOrdersFile',
        params: {
          isPDFRequired,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getMovementsFile method', async function () {
    this.timeout(3 * 60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getMovementsFile',
        params: {
          isPDFRequired,
          symbol: 'BTC',
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

  it('it should be successfully performed by the getMovementsFile method, where amount > 0', async function () {
    this.timeout(3 * 60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getMovementsFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getMovementsFile method, where amount < 0', async function () {
    this.timeout(3 * 60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getMovementsFile',
        params: {
          isPDFRequired,
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

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getLoginsFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getLoginsFile',
        params: {
          isPDFRequired,
          end,
          start,
          limit: 1000,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should be successfully performed by the getChangeLogsFile method', async function () {
    this.timeout(60000)

    const procPromise = queueToPromise(params.processorQueue)
    const aggrPromise = queueToPromise(params.aggregatorQueue)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth,
        method: 'getChangeLogsFile',
        params: {
          isPDFRequired,
          end,
          start,
          limit: 1000,
          email
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    await testMethodOfGettingReportFile(procPromise, aggrPromise, res)
  })

  it('it should not be successfully auth by the getLedgersFile method', async function () {
    this.timeout(60000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        method: 'getLedgersFile',
        params: {
          isPDFRequired,
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

  it('it should be successfully performed by the getLedgersFile method, with multiple users', async function () {
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
          method: 'getLedgersFile',
          params: {
            isPDFRequired,
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
    assert.isObject(res.body.result)
    assert.isNotOk(res.body.result.progress)
    assert.isNull(res.body.result.syncStartedAt)
    assert.isNull(res.body.result.spentTime)
    assert.isNull(res.body.result.leftTime)
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
