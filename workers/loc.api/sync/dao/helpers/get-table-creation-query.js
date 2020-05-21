'use strict'

const {
  CONSTR_FIELD_NAME,
  TRIGGER_FIELD_NAME
} = require('../const')

const _getConstraintsQuery = (name, model) => {
  const constraintsArr = Array.isArray(model[CONSTR_FIELD_NAME])
    ? model[CONSTR_FIELD_NAME]
    : [model[CONSTR_FIELD_NAME]]

  return constraintsArr.reduce((accum, item) => {
    const _constraints = (
      item &&
      typeof item === 'string'
    )
      ? `, \n  ${item}`
      : ''
    const constraints = _constraints
      .replace(/#{tableName\}/g, name)

    return `${accum}${constraints}`
  }, '')
}

module.exports = (models = [], isCreatedIfNotExists) => {
  const _models = models instanceof Map
    ? [...models]
    : models
  const _modelsArr = Array.isArray(_models)
    ? _models
    : [_models]

  return _modelsArr.map(([name, model]) => {
    const constraints = _getConstraintsQuery(name, model)

    const keys = Object.keys(model)
      .filter((field) => (
        field !== CONSTR_FIELD_NAME &&
        field !== TRIGGER_FIELD_NAME
      ))
    const columnDefs = keys.reduce((accum, field, i, arr) => {
      const isLast = arr.length === (i + 1)
      const type = model[field]

      return `${accum}${field} ${type}${isLast ? '' : ', \n  '}`
    }, '')
    const condition = isCreatedIfNotExists
      ? ' IF NOT EXISTS'
      : ''

    return `CREATE TABLE${condition} ${name}\n(\n  ${columnDefs}${constraints}\n)`
  })
}
