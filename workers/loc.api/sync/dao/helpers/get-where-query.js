'use strict'

const { omit } = require('lodash')
const FILTER_CONDITIONS = require(
  'bfx-report/workers/loc.api/helpers/filter.conditions'
)

const { serializeVal } = require('./serialization')
const SQL_OPERATORS = require('./sql.operators')

const _getCompareOperator = (
  origFieldName,
  isArr
) => {
  if (origFieldName === 'start') {
    return SQL_OPERATORS.GTE
  }
  if (origFieldName === 'end') {
    return SQL_OPERATORS.LTE
  }
  if (origFieldName === FILTER_CONDITIONS.GT) {
    return SQL_OPERATORS.GT
  }
  if (origFieldName === FILTER_CONDITIONS.GTE) {
    return SQL_OPERATORS.GTE
  }
  if (origFieldName === FILTER_CONDITIONS.LT) {
    return SQL_OPERATORS.LT
  }
  if (origFieldName === FILTER_CONDITIONS.LTE) {
    return SQL_OPERATORS.LTE
  }
  if (origFieldName === FILTER_CONDITIONS.LIKE) {
    return SQL_OPERATORS.LIKE
  }
  if (origFieldName === FILTER_CONDITIONS.NE) {
    return SQL_OPERATORS.NE
  }
  if (origFieldName === FILTER_CONDITIONS.EQ) {
    return SQL_OPERATORS.EQ
  }
  if (isArr) {
    if (origFieldName === FILTER_CONDITIONS.IN) {
      return SQL_OPERATORS.IN
    }
    if (origFieldName === FILTER_CONDITIONS.NIN) {
      return SQL_OPERATORS.NIN
    }

    return origFieldName === FILTER_CONDITIONS.NOT
      ? SQL_OPERATORS.NIN
      : SQL_OPERATORS.IN
  }

  return origFieldName === FILTER_CONDITIONS.NOT
    ? SQL_OPERATORS.NE
    : SQL_OPERATORS.EQ
}

const _getKeyAndQueryValKey = (name, isPrefixed) => {
  const key = `$${name}`
  const queryValKey = isPrefixed ? key : name

  return { key, queryValKey }
}

const _getKeysAndValuesForWhereQuery = (
  filter,
  origFieldName,
  isArr,
  alias,
  isPrefixed
) => {
  const _alias = alias && typeof alias === 'string'
    ? `${alias}_`
    : ''

  if (!isArr) {
    const name = `${_alias}${origFieldName}`
    const {
      key,
      queryValKey
    } = _getKeyAndQueryValKey(name, isPrefixed)
    const val = serializeVal(filter[origFieldName])
    const subValues = val === null
      ? {}
      : { [queryValKey]: val }

    return { key, subValues }
  }

  const subValues = {}
  const preKey = filter[origFieldName].map((item, j) => {
    const name = `${_alias}${origFieldName}_${j}`
    const {
      key,
      queryValKey
    } = _getKeyAndQueryValKey(name, isPrefixed)
    subValues[queryValKey] = serializeVal(item)

    return key
  }).join(', ')

  const key = `(${preKey})`

  return { key, subValues }
}

const _getIsNullOperator = (
  fieldName,
  filter,
  alias
) => {
  if (
    (
      fieldName !== FILTER_CONDITIONS.IS_NULL &&
      fieldName !== FILTER_CONDITIONS.IS_NOT_NULL
    ) ||
    (
      Array.isArray(filter[fieldName]) &&
      filter[fieldName].length === 0
    )
  ) {
    return false
  }
  const _alias = alias && typeof alias === 'string'
    ? `${alias}_`
    : ''
  const operator = fieldName === FILTER_CONDITIONS.IS_NOT_NULL
    ? SQL_OPERATORS.IS_NOT_NULL
    : SQL_OPERATORS.IS_NULL
  const valueArr = Array.isArray(filter[fieldName])
    ? filter[fieldName]
    : [filter[fieldName]]

  return valueArr
    .map(name => `${_alias}${name} ${operator}`)
    .join(` ${SQL_OPERATORS.AND} `)
}

const _isOrOp = (filter) => (
  filter &&
  typeof filter === 'object' &&
  filter[FILTER_CONDITIONS.OR] &&
  typeof filter[FILTER_CONDITIONS.OR] === 'object'
)

const _isCondition = (
  conditions,
  fieldName
) => {
  return conditions.some(condition => (
    condition === fieldName
  ))
}

const _isSetNoCaseOp = (
  fieldName,
  origFieldName,
  fieldsNamesToDisableCaseSensitivity
) => {
  const fieldsNamesArr = Object.entries(
    fieldsNamesToDisableCaseSensitivity
  )

  return fieldsNamesArr.some(([op, fieldNames]) => {
    return (
      op === origFieldName &&
      Array.isArray(fieldNames) &&
      fieldNames.some((name) => name === fieldName)
    )
  })
}

const _getCompareOpAndKey = (
  compareOperator,
  key,
  subValues,
  fieldName,
  origFieldName,
  fieldsNamesToDisableCaseSensitivity,
  isPrefixed
) => {
  const queryValKey = isPrefixed
    ? key
    : key.replace(/^[$]/, '')

  if (
    compareOperator === SQL_OPERATORS.EQ &&
    subValues[queryValKey] === null
  ) {
    return {
      compareOperator: SQL_OPERATORS.IS_NULL,
      key: ''
    }
  }
  if (
    compareOperator === SQL_OPERATORS.NE &&
    subValues[queryValKey] === null
  ) {
    return {
      compareOperator: SQL_OPERATORS.IS_NOT_NULL,
      key: ''
    }
  }
  if (compareOperator === SQL_OPERATORS.LIKE) {
    return {
      compareOperator,
      key: ` ${key} ${SQL_OPERATORS.ESCAPE} '\\'`
    }
  }

  const noCaseOp = _isSetNoCaseOp(
    fieldName,
    origFieldName,
    fieldsNamesToDisableCaseSensitivity
  )
    ? 'COLLATE NOCASE'
    : ''
  const _compareOperator = (
    compareOperator === SQL_OPERATORS.IN ||
    compareOperator === SQL_OPERATORS.NIN
  )
    ? `${noCaseOp} ${compareOperator}`
    : compareOperator
  const _key = (
    compareOperator === SQL_OPERATORS.EQ ||
    compareOperator === SQL_OPERATORS.NE
  )
    ? ` ${key} ${noCaseOp}`
    : ` ${key}`

  return {
    compareOperator: _compareOperator,
    key: _key
  }
}

const _getWhereQueryAndValues = (
  op = '',
  origFieldName,
  filter,
  accum,
  isArr = false,
  fieldsNamesToDisableCaseSensitivity,
  alias,
  isPrefixed,
  condName = ''
) => {
  const _alias = alias && typeof alias === 'string'
    ? `${alias}.`
    : ''
  const _compareOperator = _getCompareOperator(
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
    key: _key,
    subValues
  } = _getKeysAndValuesForWhereQuery(
    _filter,
    _fieldNameWithCondName,
    isArr,
    alias,
    isPrefixed
  )
  const {
    compareOperator,
    key
  } = _getCompareOpAndKey(
    _compareOperator,
    _key,
    subValues,
    _fieldName,
    origFieldName,
    fieldsNamesToDisableCaseSensitivity,
    isPrefixed
  )

  return {
    subValues,
    subQuery: `${accum}${op}${_alias}${_fieldName} ${compareOperator}${key}`
  }
}

const _isCondField = (fieldName, conditions) => {
  const _conditions = Array.isArray(conditions)
    ? conditions
    : Object.values(FILTER_CONDITIONS)

  return _conditions
    .some((key) => key === fieldName)
}

const _getFieldsNamesToDisableCaseSensitivity = (
  filter,
  conditions,
  outKey,
  initAccum = {}
) => {
  if (
    !filter ||
    typeof filter !== 'object' ||
    Array.isArray(filter)
  ) {
    return {}
  }

  const filterArr = Object.entries(filter)

  return filterArr.reduce((accum, [key, val]) => {
    if (_isCondField(key)) {
      return {
        ..._getFieldsNamesToDisableCaseSensitivity(
          val,
          conditions,
          key,
          accum
        )
      }
    }
    if (
      _isCondField(outKey, conditions) &&
      !_isCondField(key) &&
      (
        (
          val &&
          typeof val === 'string'
        ) ||
        (
          Array.isArray(val) &&
          val.some((item) => (
            item &&
            typeof item === 'string'
          ))
        )
      )
    ) {
      return {
        ...accum,
        [outKey]: Array.isArray(accum[outKey])
          ? [...new Set([...accum[outKey], key])]
          : [key]
      }
    }

    return accum
  }, initAccum)
}

module.exports = (
  filter = {},
  opts = {}
) => {
  const {
    isPrefixed,
    isNotSetWhereClause,
    requestedFilter,
    alias
  } = { ...opts }

  let values = {}

  const isOrOp = _isOrOp(filter)
  const _filter = isOrOp
    ? { ...filter[FILTER_CONDITIONS.OR] }
    : { ...filter }
  const operator = isOrOp
    ? SQL_OPERATORS.OR
    : SQL_OPERATORS.AND
  const conditions = [
    FILTER_CONDITIONS.GT,
    FILTER_CONDITIONS.GTE,
    FILTER_CONDITIONS.LT,
    FILTER_CONDITIONS.LTE,
    FILTER_CONDITIONS.NOT,
    FILTER_CONDITIONS.LIKE,
    FILTER_CONDITIONS.EQ,
    FILTER_CONDITIONS.NE,
    FILTER_CONDITIONS.IN,
    FILTER_CONDITIONS.NIN
  ]
  const hiddenFields = ['_dateFieldName']
  const keys = Object.keys(omit(_filter, hiddenFields))
  const fieldsNamesToDisableCaseSensitivity = _getFieldsNamesToDisableCaseSensitivity(
    requestedFilter
  )
  const where = keys.reduce(
    (accum, curr, i) => {
      const isArr = Array.isArray(_filter[curr])
      const isNullOp = _getIsNullOperator(curr, _filter, alias)
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
          (condAccum, currCond, j) => {
            const isCondArr = Array.isArray(condFilter[currCond])
            const condOp = i > 0 || j > 0 ? ` ${operator} ` : ''
            const {
              subValues,
              subQuery
            } = _getWhereQueryAndValues(
              condOp,
              curr,
              condFilter,
              condAccum,
              isCondArr,
              fieldsNamesToDisableCaseSensitivity,
              alias,
              isPrefixed,
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
        isArr,
        fieldsNamesToDisableCaseSensitivity,
        alias,
        isPrefixed
      )

      values = { ...values, ...subValues }

      return subQuery
    },
    (isNotSetWhereClause || keys.length === 0)
      ? ''
      : `${SQL_OPERATORS.WHERE} `
  )

  return { where, values }
}
