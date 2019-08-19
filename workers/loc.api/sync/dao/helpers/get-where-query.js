'use strict'

const { omit } = require('lodash')

const { serializeVal } = require('./serialization')

const _getCompareOperator = (
  origFieldName,
  isArr
) => {
  if (origFieldName === 'start') {
    return '>='
  }
  if (origFieldName === 'end') {
    return '<='
  }
  if (origFieldName === '$gt') {
    return '>'
  }
  if (origFieldName === '$gte') {
    return '>='
  }
  if (origFieldName === '$lt') {
    return '<'
  }
  if (origFieldName === '$lte') {
    return '<='
  }
  if (isArr) {
    return origFieldName === '$not' ? 'NOT IN' : 'IN'
  }

  return origFieldName === '$not' ? '!=' : '='
}

const _getKeysAndValuesForWhereQuery = (
  filter,
  origFieldName,
  isArr
) => {
  if (!isArr) {
    const key = `$${origFieldName}`
    const subValues = { [key]: serializeVal(filter[origFieldName]) }

    return { key, subValues }
  }

  const subValues = {}
  const preKey = filter[origFieldName].map((item, j) => {
    const subKey = `$${origFieldName}_${j}`
    subValues[subKey] = serializeVal(item)

    return subKey
  }).join(', ')

  const key = `(${preKey})`

  return { key, subValues }
}

const _getIsNullOperator = (
  fieldName,
  filter
) => {
  if (
    fieldName !== '$isNull' ||
    (
      Array.isArray(filter[fieldName]) &&
      filter[fieldName].length === 0
    )
  ) {
    return false
  }

  return Array.isArray(filter[fieldName])
    ? filter[fieldName].map(name => `${name} IS NULL`).join(' AND ')
    : `${filter[fieldName]} IS NULL`
}

const _isOrOp = (filter) => (
  filter &&
  typeof filter === 'object' &&
  filter.$or &&
  typeof filter.$or === 'object'
)

const _isCondition = (
  conditions,
  fieldName
) => {
  return conditions.some(condition => (
    condition === fieldName
  ))
}

const _getWhereQueryAndValues = (
  op = '',
  origFieldName,
  filter,
  accum,
  isArr = false,
  condName = ''
) => {
  const compareOperator = _getCompareOperator(
    origFieldName,
    isArr
  )
  const _isSetCondName = condName && typeof condName === 'string'
  const _fieldNameWithCondName = _isSetCondName
    ? `${condName}_${origFieldName}`
    : origFieldName
  const _fieldNameForStartEnd = (
    origFieldName === 'start' ||
    origFieldName === 'end'
  )
    ? filter._dateFieldName
    : origFieldName
  const _fieldName = _isSetCondName
    ? condName
    : _fieldNameForStartEnd
  const _filter = _isSetCondName
    ? {
      ...filter,
      [_fieldNameWithCondName]: filter[condName]
    }
    : { ...filter }
  const {
    key,
    subValues
  } = _getKeysAndValuesForWhereQuery(
    _filter,
    _fieldNameWithCondName,
    isArr
  )

  return {
    subValues,
    subQuery: `${accum}${op}${_fieldName} ${compareOperator} ${key}`
  }
}

module.exports = (filter = {}, isNotSetWhereClause) => {
  let values = {}

  const isOrOp = _isOrOp(filter)
  const _filter = isOrOp
    ? { ...filter.$or }
    : { ...filter }
  const operator = isOrOp
    ? 'OR'
    : 'AND'
  const conditions = ['$gt', '$gte', '$lt', '$lte']
  const hiddenFields = ['_dateFieldName']
  const keys = Object.keys(omit(_filter, hiddenFields))
  const where = keys.reduce(
    (accum, curr, i) => {
      const isArr = Array.isArray(_filter[curr])
      const isNullOp = _getIsNullOperator(curr, _filter)
      const op = i > 0 ? ` ${operator} ` : ''

      if (isNullOp) {
        return `${accum}${op}${isNullOp}`
      }
      if (_isCondition(
        conditions,
        curr
      )) {
        const condFilter = (
          _filter[curr] &&
          typeof _filter[curr] === 'object'
        )
          ? _filter[curr]
          : {}
        const condKeys = Object.keys(omit(condFilter, hiddenFields))
        const query = condKeys.reduce(
          (condAccum, currCond) => {
            const {
              subValues,
              subQuery
            } = _getWhereQueryAndValues(
              op,
              curr,
              condFilter,
              condAccum,
              isArr,
              currCond
            )

            values = { ...values, ...subValues }

            return subQuery
          }, '')

        return `${accum}${query}`
      }

      const {
        subValues,
        subQuery
      } = _getWhereQueryAndValues(
        op,
        curr,
        filter,
        accum,
        isArr
      )

      values = { ...values, ...subValues }

      return subQuery
    },
    (isNotSetWhereClause || keys.length === 0)
      ? '' : 'WHERE '
  )

  return { where, values }
}
