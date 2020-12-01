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
} = require('bfx-report/test/helpers/helpers.core')

const {
  startEnvironment
} = require('./helpers/helpers.boot')
const {
  emptyDB,
  getRServiceProxy,
  delay
} = require('./helpers/helpers.core')
const {
  createMockRESTv2SrvWithDate,
  getMockData
} = require('./helpers/helpers.mock-rest-v2')
const _mockData = require('./helpers/mock-data')

process.env.NODE_CONFIG_DIR = path.join(__dirname, 'config')
const { app } = require('bfx-report-express')
const agent = request.agent(app)

const {
  signUpTestCase
} = require('./test-cases')

let wrkReportServiceApi = null
let mockRESTv2Srv = null

const basePath = '/api'
const tempDirPath = path.join(__dirname, '..', 'workers/loc.api/queue/temp')
const dbDirPath = path.join(__dirname, '..', 'db')
const date = new Date()
const end = date.getTime()
const start = (new Date()).setDate(date.getDate() - 90)

const subUserApiKeysFirst = {
  apiKey: 'subUserApiKeyFirst',
  apiSecret: 'subUserApiSecretFirst'
}
const subUserApiKeysSecond = {
  apiKey: 'subUserApiKeySecond',
  apiSecret: 'subUserApiSecretSecond'
}
const masterUserApiKeys = {
  apiKey: 'masterUserApiKey',
  apiSecret: 'masterUserApiSecret'
}
const subUserEmailFirst = 'sub-user-first@email.fake'
const subUserEmailSecond = 'sub-user-second@email.fake'
const masterUserEmail = 'master-user@email.fake'
const password = '123Qwerty'

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
const _getMockData = (methodName) => {
  return getMockData(
    methodName,
    new Map([..._mockData, ...masterUserMockData])
  )
}

describe('Update sub-account', () => {
  const masterUserAuth = { token: '' }
  const subAccountAuth = { token: '' }

  before(async function () {
    this.timeout(20000)

    mockRESTv2Srv = createMockRESTv2SrvWithDate(
      start,
      end,
      10,
      undefined,
      { _getMockData }
    )

    await rmAllFiles(tempDirPath, ['README.md'])
    await rmDB(dbDirPath)
    const env = await startEnvironment(false, false, 1)

    wrkReportServiceApi = env.wrksReportServiceApi[0]

    const rService = wrkReportServiceApi.grc_bfx.api
    const rServiceProxy = getRServiceProxy(rService, {
      _checkAuthInApi (targetMethod, context, argsList) {
        const args = argsList[0]
        const { auth } = { ...args }
        const { apiKey, apiSecret } = { ...auth }

        if (
          apiKey === subUserApiKeysFirst.apiKey &&
          apiSecret === subUserApiKeysFirst.apiSecret
        ) {
          return {
            email: subUserEmailFirst,
            timezone: 'Kyiv',
            username: 'subUserNameFirst',
            id: 222
          }
        }
        if (
          apiKey === subUserApiKeysSecond.apiKey &&
          apiSecret === subUserApiKeysSecond.apiSecret
        ) {
          return {
            email: subUserEmailSecond,
            timezone: 'Sydney',
            username: 'subUserNameSecond',
            id: 333
          }
        }

        return Reflect.apply(...arguments)
      }
    })

    rService._authenticator.rService = rServiceProxy

    await emptyDB()
  })

  after(async function () {
    this.timeout(5000)

    await stopEnvironment()
    await rmDB(dbDirPath)
    await rmAllFiles(tempDirPath, ['README.md'])

    try {
      await mockRESTv2Srv.close()
    } catch (err) { }
  })

  signUpTestCase(
    agent,
    {
      basePath,
      auth: {
        email: masterUserEmail,
        password,
        isSubAccount: false
      },
      apiKeys: masterUserApiKeys
    },
    (token) => {
      masterUserAuth.token = token
    }
  )

  it('it should be successfully performed by the signIn method for master user', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: {
          email: masterUserEmail,
          password: password,
          isSubAccount: false
        },
        method: 'signIn',
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.strictEqual(res.body.result.email, masterUserEmail)
    assert.isBoolean(res.body.result.isSubAccount)
    assert.isNotOk(res.body.result.isSubAccount)
    assert.isString(res.body.result.token)
    assert.strictEqual(res.body.result.token, masterUserAuth.token)
  })

  it('it should be successfully performed by the createSubAccount method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: masterUserAuth,
        method: 'createSubAccount',
        params: {
          subAccountApiKeys: [
            subUserApiKeysFirst,
            subUserApiKeysSecond
          ]
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.strictEqual(res.body.result.email, masterUserEmail)
    assert.isBoolean(res.body.result.isSubAccount)
    assert.isOk(res.body.result.isSubAccount)
    assert.isString(res.body.result.token)

    subAccountAuth.token = res.body.result.token
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
    assert.lengthOf(res.body.result, 2)

    res.body.result.forEach((user) => {
      assert.isObject(user)
      assert.isString(user.email)
      assert.isBoolean(user.isSubAccount)
      assert.isBoolean(user.isNotProtected)
      assert.isArray(user.subUsers)

      if (user.isSubAccount) {
        assert.lengthOf(user.subUsers, 3)

        user.subUsers.forEach((subUser) => {
          assert.isString(subUser.email)
          assert.isOk(
            subUser.email === masterUserEmail ||
            subUser.email === subUserEmailFirst ||
            subUser.email === subUserEmailSecond
          )
        })
      }
    })
  })

  it('it should be successfully performed by the enableSyncMode method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: subAccountAuth,
        method: 'enableSyncMode',
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
          auth: subAccountAuth,
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

  it('it should be successfully performed by the getLedgers method, without params', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: subAccountAuth,
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

  it('it should be successfully performed by the updateSubAccount method, removing sub-users', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: subAccountAuth,
        method: 'updateSubAccount',
        params: {
          removingSubUsersByEmails: [
            { email: subUserEmailFirst },
            { email: subUserEmailSecond }
          ]
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.strictEqual(res.body.result.email, masterUserEmail)
    assert.isBoolean(res.body.result.isSubAccount)
    assert.isOk(res.body.result.isSubAccount)
    assert.isString(res.body.result.token)
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
    assert.lengthOf(res.body.result, 2)

    res.body.result.forEach((user) => {
      assert.isObject(user)
      assert.isString(user.email)
      assert.isBoolean(user.isSubAccount)
      assert.isBoolean(user.isNotProtected)
      assert.isArray(user.subUsers)

      if (user.isSubAccount) {
        assert.lengthOf(user.subUsers, 1)

        user.subUsers.forEach((subUser) => {
          assert.isString(subUser.email)
          assert.isOk(subUser.email === masterUserEmail)
          assert.isNotOk(subUser.email === subUserEmailFirst)
          assert.isNotOk(subUser.email === subUserEmailSecond)
        })
      }
    })
  })

  it('it should be successfully performed by the updateSubAccount method, adding sub-user', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: subAccountAuth,
        method: 'updateSubAccount',
        params: {
          addingSubUsers: [subUserApiKeysSecond]
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.strictEqual(res.body.result.email, masterUserEmail)
    assert.isBoolean(res.body.result.isSubAccount)
    assert.isOk(res.body.result.isSubAccount)
    assert.isString(res.body.result.token)
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
    assert.lengthOf(res.body.result, 2)

    res.body.result.forEach((user) => {
      assert.isObject(user)
      assert.isString(user.email)
      assert.isBoolean(user.isSubAccount)
      assert.isBoolean(user.isNotProtected)
      assert.isArray(user.subUsers)

      if (user.isSubAccount) {
        assert.lengthOf(user.subUsers, 2)

        user.subUsers.forEach((subUser) => {
          assert.isString(subUser.email)
          assert.isOk(
            subUser.email === masterUserEmail ||
            subUser.email === subUserEmailSecond
          )
          assert.isNotOk(subUser.email === subUserEmailFirst)
        })
      }
    })
  })

  it('it should be successfully performed by the updateSubAccount method, adding/removing sub-users', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: subAccountAuth,
        method: 'updateSubAccount',
        params: {
          addingSubUsers: [subUserApiKeysFirst],
          removingSubUsersByEmails: [
            { email: subUserEmailSecond }
          ]
        },
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.propertyVal(res.body, 'id', 5)
    assert.isObject(res.body.result)
    assert.strictEqual(res.body.result.email, masterUserEmail)
    assert.isBoolean(res.body.result.isSubAccount)
    assert.isOk(res.body.result.isSubAccount)
    assert.isString(res.body.result.token)
  })

  it('it should be successfully performed by the getSyncProgress method', async function () {
    this.timeout(60000)

    while (true) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth: subAccountAuth,
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
    assert.lengthOf(res.body.result, 2)

    res.body.result.forEach((user) => {
      assert.isObject(user)
      assert.isString(user.email)
      assert.isBoolean(user.isSubAccount)
      assert.isBoolean(user.isNotProtected)
      assert.isArray(user.subUsers)

      if (user.isSubAccount) {
        assert.lengthOf(user.subUsers, 2)

        user.subUsers.forEach((subUser) => {
          assert.isString(subUser.email)
          assert.isOk(
            subUser.email === masterUserEmail ||
            subUser.email === subUserEmailFirst
          )
          assert.isNotOk(subUser.email === subUserEmailSecond)
        })
      }
    })
  })

  it('it should be successfully performed by the getSyncProgress method', async function () {
    this.timeout(60000)

    while (true) {
      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth: subAccountAuth,
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

  it('it should be successfully performed by the getLedgers method, without params', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: subAccountAuth,
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
})
