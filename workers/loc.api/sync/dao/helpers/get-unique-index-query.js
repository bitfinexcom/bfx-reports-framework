'use strict'

module.exports = (name, fields = []) => {
  if (
    !name ||
    typeof name !== 'string' ||
    !fields ||
    !Array.isArray(fields) ||
    fields.length === 0
  ) {
    return ''
  }

  return `CREATE UNIQUE INDEX IF NOT EXISTS ${name}_${fields.join('_')}
    ON ${name}(${fields.join(', ')})`
}
