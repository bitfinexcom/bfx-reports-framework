'use strict'

const _toString = (obj) => {
  try {
    return JSON.stringify(obj)
  } catch (e) {
    return ''
  }
}

class ReportsFrameworkError extends Error {
  constructor (message) {
    super(message)

    this.name = this.constructor.name
    this.message = message

    Error.captureStackTrace(this, this.constructor)
  }
}

class DependencyInjectionError extends ReportsFrameworkError {
  constructor (ajvErrors) {
    const errStr = _toString(ajvErrors)

    super(`ERR_OF_DEPENDENCY_INJECTION ${errStr}`)
  }
}

module.exports = {
  ReportsFrameworkError,
  DependencyInjectionError
}
