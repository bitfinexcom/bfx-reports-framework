'use strict'

const { TRIGGER_FIELD_NAME } = require('../const')

const _getTriggersQuery = (
  name,
  model,
  isCreatedIfNotExists
) => {
  const triggersArr = Array.isArray(model[TRIGGER_FIELD_NAME])
    ? model[TRIGGER_FIELD_NAME]
    : [model[TRIGGER_FIELD_NAME]]

  return triggersArr.reduce((accum, item) => {
    if (
      !item ||
      typeof item !== 'string'
    ) {
      return accum
    }

    const stm = item.replace(/#{tableName\}/g, name)
    const condition = isCreatedIfNotExists
      ? ' IF NOT EXISTS'
      : ''
    const trigger = `CREATE TRIGGER${condition} ${stm}`

    accum.push(trigger)

    return accum
  }, [])
}

module.exports = (models = [], isCreatedIfNotExists) => {
  const _models = models instanceof Map
    ? [...models]
    : models
  const _modelsArr = Array.isArray(_models)
    ? _models
    : [_models]

  return _modelsArr.reduce((accum, [name, model]) => {
    const triggers = _getTriggersQuery(
      name,
      model,
      isCreatedIfNotExists
    )

    accum.push(...triggers)

    return accum
  }, [])
}
