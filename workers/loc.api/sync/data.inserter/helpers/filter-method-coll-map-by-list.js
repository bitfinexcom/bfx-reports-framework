'use strict'

const { isPublic } = require('../../schema/utils')

const _reduceMethodCollMap = (
  _methodCollMap,
  res,
  isAllowed = () => true
) => {
  return [..._methodCollMap].reduce((accum, curr) => {
    const name = curr[1].getModelField('NAME')

    if (
      accum.every(item => item.name !== name) &&
      res.every(item => item.name !== name) &&
      isAllowed(curr)
    ) {
      accum.push(curr)
    }

    return accum
  }, [])
}

const _isPubColl = (coll) => {
  const type = coll[1].getModelField('TYPE')

  return isPublic(type)
}

const _isAllowedColl = (coll, allowedCollsNames) => {
  const name = coll[1].getModelField('NAME')

  return allowedCollsNames.some(item => item === name)
}

module.exports = (
  syncSchema,
  ALLOWED_COLLS,
  syncColls,
  allowedCollsNames
) => {
  const res = []
  const _methodCollMap = syncSchema.getMethodCollMap()

  for (const collName of syncColls) {
    if (collName === ALLOWED_COLLS.ALL) {
      const subRes = _reduceMethodCollMap(
        _methodCollMap,
        res,
        coll => _isAllowedColl(coll, allowedCollsNames)
      )

      res.push(...subRes)

      break
    }
    if (collName === ALLOWED_COLLS.PUBLIC) {
      const subRes = _reduceMethodCollMap(
        _methodCollMap,
        res,
        coll => (
          (_isAllowedColl(coll, allowedCollsNames) &&
          _isPubColl(coll))
        )
      )

      res.push(...subRes)

      continue
    }
    if (collName === ALLOWED_COLLS.PRIVATE) {
      const subRes = _reduceMethodCollMap(
        _methodCollMap,
        res,
        coll => (
          (_isAllowedColl(coll, allowedCollsNames) &&
          !_isPubColl(coll))
        )
      )

      res.push(...subRes)

      continue
    }

    const subRes = _reduceMethodCollMap(
      _methodCollMap,
      res,
      (curr) => {
        const name = curr[1].getModelField('NAME')

        return name === collName
      }
    )

    res.push(...subRes)
  }

  return new Map(res)
}
