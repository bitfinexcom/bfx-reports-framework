'use strict'

const responder = require(
  '@bitfinex/bfx-report/workers/loc.api/responder'
)
const Context = require(
  '@bitfinex/bfx-report/workers/loc.api/responder/context'
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
  if (!ctx.hasInterrupter()) {
    return args
  }
  if (
    !args ||
    typeof args !== 'object'
  ) {
    return { interrupter: ctx.getInterrupter() }
  }

  args.interrupter = ctx.getInterrupter()

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
    const ctx = mainContext instanceof Context
      ? mainContext
      : context
    const user = await authenticator.verifyRequestUser(
      args,
      { isForcedVerification: true }
    )
    ctx.setInterrupter(_getInterrupter(
      interrupterName,
      interrupterFactory,
      user,
      args
    ))
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
  const context = new Context()

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
