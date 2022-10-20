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
  isPublic,
  isPubAndPriv
) => {
  const _pub = isPublic ? PUBLIC : ''
  const startPattern = isPubAndPriv
    ? ''
    : `^${_pub}`
  const regExp = new RegExp(`${startPattern}${type}$`, 'i')

  return regExp.test(coll.type)
}

const isInsertableArrObjTypeOfColl = (coll, isPublic, isPubAndPriv) => {
  return checkCollType(
    INSERTABLE_ARRAY_OBJECTS,
    coll,
    isPublic,
    isPubAndPriv
  )
}

const isUpdatableArrObjTypeOfColl = (coll, isPublic, isPubAndPriv) => {
  return checkCollType(
    UPDATABLE_ARRAY_OBJECTS,
    coll,
    isPublic,
    isPubAndPriv
  )
}

const isUpdatableArrTypeOfColl = (coll, isPublic, isPubAndPriv) => {
  return checkCollType(
    UPDATABLE_ARRAY,
    coll,
    isPublic,
    isPubAndPriv
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
