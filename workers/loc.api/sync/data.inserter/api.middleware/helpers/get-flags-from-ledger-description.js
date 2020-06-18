'use strict'

module.exports = (
  ledger,
  schemas = []
) => {
  if (
    !ledger ||
    typeof ledger !== 'object' ||
    typeof ledger.description !== 'string'
  ) {
    return {}
  }

  return schemas.reduce((accum, schema) => {
    const {
      fieldName,
      pattern,
      isCaseSensitivity
    } = { ...schema }
    const regExp = new RegExp(
      pattern,
      isCaseSensitivity ? '' : 'i'
    )

    return {
      ...accum,
      [fieldName]: regExp.test(ledger.description)
    }
  }, {})
}
