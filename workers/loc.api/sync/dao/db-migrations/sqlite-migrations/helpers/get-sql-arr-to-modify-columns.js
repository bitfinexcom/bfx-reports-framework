'use strict'

const CONSTR_FIELD_NAME = '__constraints__'

module.exports = (
  tableName,
  requiredModel = {}
) => {
  if (
    !tableName ||
    typeof tableName !== 'string' ||
    !requiredModel ||
    typeof requiredModel !== 'object' ||
    Object.keys(requiredModel).length < 2
  ) {
    return []
  }

  const oldTableName = `${tableName}Old`

  const constraintsArr = Array.isArray(requiredModel[CONSTR_FIELD_NAME])
    ? requiredModel[CONSTR_FIELD_NAME]
    : [requiredModel[CONSTR_FIELD_NAME]]
  const constraints = constraintsArr.reduce((accum, item) => {
    const _constraints = (
      item &&
      typeof item === 'string'
    )
      ? `, \n  ${item}`
      : ''
    const constraints = _constraints
      .replace(/#{tableName\}/g, tableName)

    return `${accum}${constraints}`
  }, '')

  const keys = Object.keys(requiredModel)
    .filter((key) => key !== CONSTR_FIELD_NAME)
  const columnNames = keys.join(', ')
  const columnDefs = keys.reduce((accum, field, i, arr) => {
    const isLast = arr.length === (i + 1)
    const type = requiredModel[field]

    return `${accum}${field} ${type}${isLast ? '' : ', \n  '}`
  }, '')

  const sqlArr = [
    `ALTER TABLE ${tableName} RENAME TO ${oldTableName}`,
    `CREATE TABLE ${tableName}\n(\n  ${columnDefs}${constraints}\n)`,
    `INSERT INTO ${tableName} (${columnNames})
      SELECT ${columnNames}
      FROM ${oldTableName}`,
    `DROP TABLE ${oldTableName}`
  ]

  return sqlArr
}
