'use strict'

const {
  PUBLIC,
  HIDDEN,
  INSERTABLE_ARRAY_OBJECTS,
  UPDATABLE_ARRAY_OBJECTS,
  UPDATABLE_ARRAY
} = require('../colls.types')

const checkCollType = (
  type,
  coll,
  isPublic
) => {
  const _pub = isPublic ? PUBLIC : ''
  const regExp = new RegExp(`^${_pub}${type}$`, 'i')

  return regExp.test(coll.type)
}

const isInsertableArrObjTypeOfColl = (coll, isPublic) => {
  return checkCollType(
    INSERTABLE_ARRAY_OBJECTS,
    coll,
    isPublic
  )
}

const isUpdatableArrObjTypeOfColl = (coll, isPublic) => {
  return checkCollType(
    UPDATABLE_ARRAY_OBJECTS,
    coll,
    isPublic
  )
}

const isUpdatableArrTypeOfColl = (coll, isPublic) => {
  return checkCollType(
    UPDATABLE_ARRAY,
    coll,
    isPublic
  )
}

const isInsertableArrObjAnyProtection = (type = '') => {
  const regExp = new RegExp(
    `^((${HIDDEN})|(${PUBLIC})|())${INSERTABLE_ARRAY_OBJECTS}$`,
    'i'
  )

  return regExp.test(type)
}

const isPublic = (type = '') => {
  const regExp = new RegExp(`^${PUBLIC}`, 'i')

  return regExp.test(type)
}

const isHidden = (type = '') => {
  const regExp = new RegExp(`^${HIDDEN}`, 'i')

  return regExp.test(type)
}

module.exports = {
  checkCollType,
  isInsertableArrObjTypeOfColl,
  isUpdatableArrObjTypeOfColl,
  isUpdatableArrTypeOfColl,
  isInsertableArrObjAnyProtection,
  isPublic,
  isHidden
}
