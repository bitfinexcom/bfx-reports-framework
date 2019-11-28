'use strict'

module.exports = (models = [], isCreatedIfNotExists) => {
  const _models = models instanceof Map
    ? [...models]
    : models
  const _modelsArr = Array.isArray(_models)
    ? _models
    : [_models]

  return _modelsArr.map(([name, model]) => {
    const keys = Object.keys(model)
    const columnDefs = keys.reduce((accum, field, i, arr) => {
      const isLast = arr.length === (i + 1)
      const type = model[field].replace(/[#]\{field\}/g, field)

      return `${accum}${field} ${type}${isLast ? '' : ', \n'}`
    }, '')
    const condition = isCreatedIfNotExists
      ? ' IF NOT EXISTS'
      : ''

    return `CREATE TABLE${condition} ${name} (
      ${columnDefs}
      )`
  })
}
