'use strict'

module.exports = (
  item,
  stringPropName,
  schemas = []
) => {
  const stringProp = item?.[stringPropName]

  if (typeof stringProp !== 'string') {
    return {}
  }

  return schemas.reduce((accum, schema) => {
    const {
      fieldName,
      pattern,
      handler,
      isCaseSensitivity
    } = schema ?? {}

    if (typeof handler === 'function') {
      return {
        ...accum,
        [fieldName]: handler(stringProp)
      }
    }

    const regExp = new RegExp(
      pattern,
      isCaseSensitivity ? '' : 'i'
    )

    return {
      ...accum,
      [fieldName]: regExp.test(stringProp)
    }
  }, {})
}
