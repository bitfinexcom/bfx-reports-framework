'use strict'

module.exports = (fields = [], opts = {}) => {
  const {
    name,
    isUnique
  } = { ...opts }

  if (
    !name ||
    typeof name !== 'string' ||
    !Array.isArray(fields) ||
    fields.length === 0
  ) {
    return []
  }

  const unique = isUnique ? ' UNIQUE' : ''
  const rootFields = fields.filter((field) => {
    return field && typeof field === 'string'
  })
  const fieldsArr = fields.filter((_fields) => {
    return (
      Array.isArray(_fields) &&
      _fields.length > 0 &&
      _fields.every((field) => field && typeof field === 'string')
    )
  })
  const _fields = [
    ...(rootFields.length > 0 ? [rootFields] : []),
    ...fieldsArr
  ]

  return _fields.map((fields) => {
    return `CREATE${unique} INDEX IF NOT EXISTS ${name}_${fields.join('_')}
      ON ${name}(${fields.join(', ')})`
  })
}
