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
  wsEventEmitter,
  authenticator
) => (
  handler,
  name,
  args,
  cb
) => {
  const _name = typeof name === 'string'
    ? `${name} [PROTECTED]`
    : name

  const _responder = responder(
    container,
    logger,
    wsEventEmitter
  )
  const _handler = _getHandler(
    authenticator,
    handler,
    args
  )

  return _responder(
    _handler,
    _name,
    args,
    cb
  )
}
