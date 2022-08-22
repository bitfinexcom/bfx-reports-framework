'use strict'

const {
  INDEX_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME
} = require('../../schema/const')

const _getIndexQuery = (
  name,
  fields = [],
  opts = {}
) => {
  const {
    isUnique,
    shouldNotAddIfNotExistsStm
  } = opts ?? {}

  if (
    !name ||
    typeof name !== 'string' ||
    !Array.isArray(fields) ||
    fields.length === 0
  ) {
    return []
  }

  const unique = isUnique ? ' UNIQUE' : ''
  const condition = shouldNotAddIfNotExistsStm
    ? ''
    : ' IF NOT EXISTS'

  const rootFields = fields.filter((field) => {
    return field && typeof field === 'string'
  })
  const fieldsArr = fields.filter((item) => {
    return (
      Array.isArray(item) &&
      item.length > 0 &&
      item.every((field) => field && typeof field === 'string')
    )
  })
  const indexFields = [
    ...(rootFields.length > 0 ? [rootFields] : []),
    ...fieldsArr
  ]

  return indexFields.map((fields) => {
    const _fields = fields.filter((field) => (
      !field.startsWith('WHERE')
    ))
    const where = fields.find((field) => (
      field.startsWith('WHERE')
    ))
    const whereClause = where ? ` ${where}` : ''

    return `CREATE${unique} INDEX${condition} ${name}_${_fields.join('_')}
      ON ${name}(${_fields.join(', ')}) ${whereClause}`
  })
}

const _getIndexQueryFromModel = (
  name,
  model,
  opts
) => {
  const {
    shouldNotAddIfNotExistsStm
  } = opts ?? {}

  const uniqueIndexFields = (
    model[UNIQUE_INDEX_FIELD_NAME] &&
    typeof model[UNIQUE_INDEX_FIELD_NAME] === 'string'
  )
    ? model[UNIQUE_INDEX_FIELD_NAME].split(' ')
    : model[UNIQUE_INDEX_FIELD_NAME]
  const indexFields = (
    model[INDEX_FIELD_NAME] &&
    typeof model[INDEX_FIELD_NAME] === 'string'
  )
    ? model[INDEX_FIELD_NAME].split(' ')
    : model[INDEX_FIELD_NAME]

  const uniqueIndexiesArr = _getIndexQuery(
    name,
    uniqueIndexFields,
    { isUnique: true, shouldNotAddIfNotExistsStm }
  )
  const indexiesArr = _getIndexQuery(
    name,
    indexFields,
    { shouldNotAddIfNotExistsStm }
  )

  return [
    ...uniqueIndexiesArr,
    ...indexiesArr
  ]
}

module.exports = (
  models = [],
  opts = {}
) => {
  const {
    namePrefix
  } = opts ?? {}

  const _models = models instanceof Map
    ? [...models]
    : models
  const _modelsArr = Array.isArray(_models)
    ? _models
    : [_models]

  return _modelsArr.reduce((accum, [name, model]) => {
    const prefix = typeof namePrefix === 'function'
      ? namePrefix(name, model)
      : namePrefix ?? ''
    const _name = `${prefix}${name}`
    const indexies = _getIndexQueryFromModel(
      _name,
      model,
      opts
    )

    accum.push(...indexies)

    return accum
  }, [])
}
