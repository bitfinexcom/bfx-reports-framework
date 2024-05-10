'use strict'

const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const TYPES = require('../types')

module.exports = (ctx) => {
  const authenticator = ctx.container.get(TYPES.Authenticator)

  return (params) => {
    const { user, name } = params ?? {}

    if (!user) {
      throw new AuthError()
    }

    const interrupter = ctx.container.get(
      TYPES.Interrupter
    ).setName(name)

    authenticator.setInterrupterToUserSession(
      user, interrupter
    )

    return interrupter
  }
}
