'use strict'

const {
  AuthError
} = require('@bitfinex/bfx-report/workers/loc.api/errors')

const TYPES = require('../types')

module.exports = (ctx) => {
  const authenticator = ctx.get(TYPES.Authenticator)

  return (params) => {
    const { user, name } = params ?? {}

    if (!user) {
      throw new AuthError()
    }

    const interrupter = ctx.get(
      TYPES.Interrupter
    ).setName(name)

    authenticator.setInterrupterToUserSession(
      user, interrupter
    )

    return interrupter
  }
}
