'use strict'

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

      await messageHandler(err, state, data)
    }
  }

  process.on('message', handler)

  return handler
}

const offMessage = (messageHandler) => {
  process.removeListener('message', messageHandler)
}

const sendState = (state, data) => {
  if (
    !state ||
    typeof state !== 'string'
  ) {
    throw new ProcessStateSendingError()
  }
  if (
    typeof process.send !== 'function' ||
    !process.connected
  ) {
    return false
  }

  const payload = (
    data &&
    typeof data === 'object'
  )
    ? { state, data }
    : { state }

  process.send(payload)

  return true
}

module.exports = {
  onMessage,
  offMessage,
  sendState
}
