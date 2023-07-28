'use strict'

const { assert } = require('chai')

const { delay } = require('../helpers/helpers.core')

module.exports = (
  agent,
  params = {}
) => {
  const {
    basePath,
    auth
  } = params

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
      assert.isObject(res.body.result)
      assert.isNumber(res.body.result.progress)

      assert.isOk(
        res.body.result.syncStartedAt === null ||
        Number.isInteger(res.body.result.syncStartedAt)
      )
      assert.isOk(
        res.body.result.spentTime === null ||
        Number.isInteger(res.body.result.spentTime)
      )
      if (Number.isFinite(res.body.result.syncStartedAt)) {
        Number.isInteger(res.body.result.spentTime)
      }

      if (
        !Number.isFinite(res.body.result.syncStartedAt) ||
        !Number.isFinite(res.body.result.progress) ||
        res.body.result.progress <= 0 ||
        res.body.result.progress > 100
      ) {
        assert.isNull(res.body.result.leftTime)
      } else {
        assert.isNumber(res.body.result.leftTime)
      }

      if (res.body.result.progress === 100) {
        break
      }

      await delay()
    }
  })
}
