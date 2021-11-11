'use strict'

const {
  ProcessStateSendingError
} = require('../errors')

const onMessage = (params) => {
  const {
    messageHandler,
    errorHandler
  } = params ?? {}

  const handler = async (mess) => {
    try {
      const {
        state,
        data
      } = mess ?? {}

      if (
        !state ||
        typeof state !== 'string'
      ) {
        return
      }

      await messageHandler(state, data)
    } catch (err) {
      this.logger.error(err)

      errorHandler(err)
    }
  }

  process.on('message', handler)

  return handler
}

const sendState = (state, data) => {
  if (
    !state ||
    typeof state !== 'string'
  ) {
    throw new ProcessStateSendingError()
  }

  const payload = (
    data &&
    typeof data === 'object'
  )
    ? { state, data }
    : { state }

  process.send(payload)
}

module.exports = {
  onMessage,
  sendState
}
