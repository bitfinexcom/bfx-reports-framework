'use strict'

if (typeof process.send !== 'function') {
  process.send = () => {}
}

const {
  ProcessStateSendingError
} = require('../errors')

const onMessage = (messageHandler, logger) => {
  const handler = async (mess) => {
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

    try {
      await messageHandler(null, state, data)
    } catch (err) {
      if (logger) {
        logger.error(err)
      }

      messageHandler(err, state, data)
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
