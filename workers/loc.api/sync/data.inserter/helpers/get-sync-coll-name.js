'use strict'

const { upperCase, snakeCase } = require('lodash')

module.exports = (method) => {
  const name = method.replace(/^[^A-Z]+/, '')
  const upperCaseName = upperCase(name)
  const snakeCaseName = snakeCase(upperCaseName)

  return snakeCaseName
}
