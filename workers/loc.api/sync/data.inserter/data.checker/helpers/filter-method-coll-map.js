'use strict'

module.exports = (
  methodCollMap,
  isPublic
) => {
  return new Map([...methodCollMap].filter(([key, schema]) => {
    const { type, hasNewData } = schema
    const _isHidden = /^hidden:/i.test(type)

    if (_isHidden) {
      return false
    }

    const _isPublic = /^public:/i.test(type)
    const isAllowed = isPublic ? _isPublic : !_isPublic

    return hasNewData && isAllowed
  }))
}
