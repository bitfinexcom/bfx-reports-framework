'use strict'

const { assert } = require('chai')

module.exports = (
  agent,
  params = {},
  cb
) => {
  const {
    basePath,
    auth: {
      email,
      password,
      isSubAccount
    },
    apiKeys,
    authToken
  } = params

  it('it should be successfully performed by the signUp method', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        auth: {
          ...apiKeys,
          authToken,
          password
        },
        method: 'signUp',
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
    assert.isBoolean(res.body.result.isUserMerchant)

    if (typeof cb === 'function') {
      await cb(res.body.result.token)
    }
  })
}
