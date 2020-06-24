'use strict'

const {
  isPublic: isPublicType,
  isHidden: isHiddenType
} = require('../../../schema/utils')

module.exports = (
  methodCollMap,
  isPublic
) => {
  return new Map([...methodCollMap].filter(([key, schema]) => {
    const { type, hasNewData } = schema
    const _isHidden = isHiddenType(type)

    if (_isHidden) {
      return false
    }

    const _isPublic = isPublicType(type)
    const isAllowed = isPublic ? _isPublic : !_isPublic

    return hasNewData && isAllowed
  }))
}
