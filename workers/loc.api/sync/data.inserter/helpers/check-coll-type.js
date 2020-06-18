'use strict'

const checkCollType = (
  type,
  coll,
  isPublic
) => {
  const _pub = isPublic ? 'public:' : ''
  const regExp = new RegExp(`^${_pub}${type}$`, 'i')

  return regExp.test(coll.type)
}

const isInsertableArrObjTypeOfColl = (coll, isPublic) => {
  return checkCollType(
    'insertable:array:objects',
    coll,
    isPublic
  )
}

const isUpdatableArrObjTypeOfColl = (coll, isPublic) => {
  return checkCollType(
    'updatable:array:objects',
    coll,
    isPublic
  )
}

const isUpdatableArrTypeOfColl = (coll, isPublic) => {
  return checkCollType(
    'updatable:array',
    coll,
    isPublic
  )
}

module.exports = {
  checkCollType,
  isInsertableArrObjTypeOfColl,
  isUpdatableArrObjTypeOfColl,
  isUpdatableArrTypeOfColl
}
