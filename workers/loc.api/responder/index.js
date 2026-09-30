'use strict'

const responder = require(
  '@bitfinex/bfx-report/workers/loc.api/responder'
)
const Interrupter = require(
  '@bitfinex/bfx-report/workers/loc.api/interrupter'
)

const _getInterrupter = (
  interrupterName,
  interrupterFactory,
  user,
  args
) => {
  if (
    !interrupterName ||
    args?.interrupter instanceof Interrupter
  ) {
    return null
  }
  if (interrupterName instanceof Interrupter) {
    return interrupterName
  }

  return interrupterFactory({ user, name: interrupterName })
}
const _getArgsWithInterrupter = (args, ctx) => {
  if (!(ctx.interrupter instanceof Interrupter)) {
    return args
  }
  if (
    !args ||
    typeof args !== 'object'
  ) {
    return { interrupter: ctx.interrupter }
  }

  args.interrupter = ctx.interrupter

  return args
}

const _getHandler = (
  authenticator,
  interrupterName,
  interrupterFactory,
  context,
  handler
) => {
  return async (mainContext, args) => {
    const ctx = mainContext ?? context
    const user = await authenticator.verifyRequestUser(
      args,
      { isForcedVerification: true }
    )
    ctx.interrupter = _getInterrupter(
      interrupterName,
      interrupterFactory,
      user,
      args
    )
    const handlerArgs = _getArgsWithInterrupter(args, ctx)

    return handler(ctx, handlerArgs)
  }
}

module.exports = (
  logger,
  wsEventEmitterFactory,
  authenticator,
  interrupterFactory
) => (
  handler,
  name,
  args,
  cb,
  interrupterName
) => {
  const _name = typeof name === 'string'
    ? `${name} [PROTECTED]`
    : name
  const context = { interrupter: null }

  const _responder = responder(
    logger,
    wsEventEmitterFactory
  )
  const _handler = _getHandler(
    authenticator,
    interrupterName,
    interrupterFactory,
    context,
    handler
  )

  return _responder(
    _handler,
    _name,
    args,
    cb
  )
}
