'use strict'

const { assert } = require('chai')

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
    }
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

  it('it should be successfully performed by the removeUser method with email', async function () {
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
