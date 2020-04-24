'use strict'

const responder = require('bfx-report/workers/loc.api/responder')

const _getHandler = (
  authenticator,
  handler,
  args
) => {
  return async (...handlerArgs) => {
    await authenticator.verifyRequestUser(
      args,
      { isForcedVerification: true }
    )

    return handler(...handlerArgs)
  }
}

module.exports = (
  container,
  logger,
  authenticator
) => (
  handler,
  name,
  args,
  done
) => {
  const cb = typeof name === 'function'
    ? name
    : args
  const _done = typeof cb === 'function'
    ? cb
    : done

  const _argsFromNameParam = name && typeof name === 'object'
    ? name
    : args
  const _args = (
    _argsFromNameParam &&
    typeof _argsFromNameParam === 'object'
  )
    ? _argsFromNameParam
    : {}
  const _name = typeof name === 'string'
    ? `${name} [PROTECTED]`
    : name

  const _responder = responder(
    container,
    logger
  )
  const _handler = _getHandler(
    authenticator,
    handler,
    _args
  )

  return _responder(
    _handler,
    _name,
    _done
  )
}
