'use strict'

const isEnotfoundError = (err) => {
  return /ENOTFOUND/.test(err.toString())
}

const isEaiAgainError = (err) => {
  return /EAI_AGAIN/.test(err.toString())
}

module.exports = {
  isEnotfoundError,
  isEaiAgainError
}
