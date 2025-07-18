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
  getRServiceProxy
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
  apiSyncModeSqliteTestCases,
  additionalApiSyncModeSqliteTestCases,
  signUpTestCase,
  removeUserTestCases
} = require('./test-cases')

let wrkReportServiceApi = null
let mockRESTv2Srv = null

const basePath = '/api'
const tempDirPath = path.join(__dirname, '..', 'workers/loc.api/queue/temp')
const dbDirPath = path.join(__dirname, '..', 'db')
const date = new Date()
const end = date.getTime()
const start = (new Date()).setDate(date.getDate() - 90)

const subUserApiKeys = {
  apiKey: 'subUserApiKey',
  apiSecret: 'subUserApiSecret'
}
const masterUserApiKeys = {
  apiKey: 'masterUserApiKey',
  apiSecret: 'masterUserApiSecret'
}
const subUserEmail = 'sub-user@email.fake'
const masterUserEmail = 'master-user@email.fake'
const password = '123Qwerty'
const isSubAccount = true

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

describe('Sub-account', () => {
  before(async function () {
    this.timeout(20000)

    mockRESTv2Srv = createMockRESTv2SrvWithDate(
      start,
      end,
      100,
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
          apiKey === subUserApiKeys.apiKey &&
          apiSecret === subUserApiKeys.apiSecret
        ) {
          return {
            email: subUserEmail,
            timezone: 'Kyiv',
            username: 'subUserName',
            id: 222
          }
        }

        return Reflect.apply(...arguments)
      }
    })

    rService._authenticator.rService = rServiceProxy

    await emptyDB()
  })

  after(async function () {
    this.timeout(20000)

    await stopEnvironment()
    await rmDB(dbDirPath)
    await rmAllFiles(tempDirPath, ['README.md'])

    try {
      await mockRESTv2Srv.close()
    } catch (err) { }
  })

  describe('Sign-up as master user', () => {
    const masterUserAuth = { token: '' }

    it('it should not be successfully performed by the createSubAccount method', async function () {
      this.timeout(5000)

      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth: {
            email: masterUserEmail,
            password
          },
          method: 'createSubAccount',
          params: {
            subAccountApiKeys: [subUserApiKeys]
          },
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
            password,
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
      assert.strictEqual(res.body.result.token, masterUserAuth.token)
    })

    it('it should not be successfully performed by the signIn method for sub-account', async function () {
      this.timeout(5000)

      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth: {
            email: masterUserEmail,
            password,
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
  })

  describe('Create sub-account', () => {
    const masterUserAuth = { token: '' }
    const subAccountAuth = { token: '' }

    it('it should be successfully performed by the signIn method for master user', async function () {
      this.timeout(5000)

      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth: {
            email: masterUserEmail,
            password,
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

      masterUserAuth.token = res.body.result.token
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
            subAccountApiKeys: [subUserApiKeys],
            localUsername: 'testLocalUsername'
          },
          id: 5
        })
        .expect('Content-Type', /json/)
        .expect(200)

      assert.isObject(res.body)
      assert.propertyVal(res.body, 'id', 5)
      assert.isObject(res.body.result)
      assert.strictEqual(res.body.result.email, masterUserEmail)
      assert.strictEqual(res.body.result.isSubAccount, isSubAccount)
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

      res.body.result.forEach((user) => {
        assert.isObject(user)
        assert.isString(user.email)
        assert.isBoolean(user.isSubAccount)
        assert.isBoolean(user.isNotProtected)
        assert.isBoolean(user.isRestrictedToBeAddedToSubAccount)
        assert.isBoolean(user.isApiKeysAuth)
        assert.isArray(user.subUsers)

        if (user.isSubAccount) {
          assert.isString(user.localUsername)
        }

        user.subUsers.forEach((subUser) => {
          assert.isString(subUser.email)
        })
      })
    })

    it('it should be successfully performed by the signIn method for sub-account', async function () {
      this.timeout(5000)

      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth: {
            email: masterUserEmail,
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
      assert.strictEqual(res.body.result.email, masterUserEmail)
      assert.isBoolean(res.body.result.isSubAccount)
      assert.strictEqual(res.body.result.isSubAccount, isSubAccount)
      assert.isString(res.body.result.token)
      assert.isString(res.body.result.localUsername)

      assert.strictEqual(res.body.result.token, subAccountAuth.token)
    })

    it('it should be successfully performed by the verifyUser method', async function () {
      this.timeout(5000)

      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth: subAccountAuth,
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
      assert.strictEqual(res.body.result.email, masterUserEmail)
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

    it('it should be successfully performed by the updateUser method for localUsername field', async function () {
      this.timeout(5000)

      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth: subAccountAuth,
          method: 'updateUser',
          params: {
            localUsername: 'updatedTestLocalUsername'
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

    it('it should be successfully performed by the signIn method for sub-account with updated localUsername', async function () {
      this.timeout(5000)

      const res = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth: {
            email: masterUserEmail,
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
      assert.strictEqual(res.body.result.isSubAccount, isSubAccount)
      assert.strictEqual(res.body.result.localUsername, 'updatedTestLocalUsername')
    })
  })

  describe('API with SQLite', () => {
    const params = {
      processorQueue: null,
      aggregatorQueue: null,
      basePath,
      auth: {
        email: masterUserEmail,
        password,
        isSubAccount
      },
      apiKeys: {
        apiKey: `${masterUserApiKeys.apiKey}-sub-account`,
        apiSecret: `${masterUserApiKeys.apiSecret}-sub-account`
      },
      date,
      end,
      start
    }

    before(() => {
      params.processorQueue = wrkReportServiceApi.lokue_processor.q
      params.aggregatorQueue = wrkReportServiceApi.lokue_aggregator.q
    })

    const beforeFn = async function () {
      this.timeout(20000)

      await emptyDB()

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
        }
      )
      signUpTestCase(
        agent,
        {
          basePath,
          auth: {
            email: subUserEmail,
            password,
            isSubAccount: false
          },
          apiKeys: subUserApiKeys
        }
      )

      const masterUserRes = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth: {
            ...masterUserApiKeys,
            password
          },
          method: 'signUp'
        })
      const subUserRes = await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth: {
            ...subUserApiKeys,
            password
          },
          method: 'signUp'
        })
      await agent
        .post(`${basePath}/json-rpc`)
        .type('json')
        .send({
          auth: { token: masterUserRes.body.result.token },
          method: 'createSubAccount',
          params: {
            subAccountApiKeys: [{ token: subUserRes.body.result.token }]
          }
        })
    }

    describe('Sync mode API', () => {
      describe('CSV generation', () => {
        before(beforeFn)

        params.isPDFRequired = false
        apiSyncModeSqliteTestCases(agent, params)
      })

      describe('PDF generation', () => {
        before(beforeFn)

        params.isPDFRequired = true
        apiSyncModeSqliteTestCases(agent, params)
      })
    })
    describe('Additional sync mode API', () => {
      describe('CSV generation', () => {
        before(beforeFn)

        params.isPDFRequired = false
        additionalApiSyncModeSqliteTestCases(agent, params)
      })

      describe('PDF generation', () => {
        before(beforeFn)

        params.isPDFRequired = true
        additionalApiSyncModeSqliteTestCases(agent, params)
      })
    })
    describe('Removing sub-account API', () => {
      before(beforeFn)

      removeUserTestCases(agent, params)
    })
  })
})
