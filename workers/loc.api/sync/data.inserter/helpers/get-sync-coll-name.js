'use strict'

const { snakeCase } = require('lodash')

module.exports = (method) => {
  const name = method.replace(/^[^A-Z]+/, '')
  const snakeCaseName = snakeCase(name)
  const upperCaseName = snakeCaseName.toUpperCase()

  return upperCaseName
}
