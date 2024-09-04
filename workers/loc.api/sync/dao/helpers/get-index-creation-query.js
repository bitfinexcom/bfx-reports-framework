'use strict'

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

  const modelUniqueIndexies = model.getUniqueIndexies()
  const modelIndexies = model.getIndexies()
  const uniqueIndexFields = (
    modelUniqueIndexies &&
    typeof modelUniqueIndexies === 'string'
  )
    ? modelUniqueIndexies.split(' ')
    : modelUniqueIndexies
  const indexFields = (
    modelIndexies &&
    typeof modelIndexies === 'string'
  )
    ? modelIndexies.split(' ')
    : modelIndexies

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
