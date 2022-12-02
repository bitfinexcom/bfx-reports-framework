'use strict'

const {
  SEPARATOR,

  PUBLIC,
  HIDDEN,

  UPDATABLE,

  INSERTABLE_ARRAY_OBJECTS,
  UPDATABLE_ARRAY_OBJECTS,
  UPDATABLE_ARRAY
} = require('../colls.types')

const publicCollRegExp = new RegExp(`${PUBLIC}${SEPARATOR}`, 'i')
const hiddenCollRegExp = new RegExp(`${HIDDEN}${SEPARATOR}`, 'i')
const updatableCollRegExp = new RegExp(`${UPDATABLE}${SEPARATOR}`, 'i')

const isInsertableArrObj = (type = '', opts) => {
  const regExp = _getRegExp(INSERTABLE_ARRAY_OBJECTS, opts)

  return regExp.test(type)
}

const isUpdatableArrObj = (type = '', opts) => {
  const regExp = _getRegExp(UPDATABLE_ARRAY_OBJECTS, opts)

  return regExp.test(type)
}

const isUpdatableArr = (type = '', opts) => {
  const regExp = _getRegExp(UPDATABLE_ARRAY, opts)

  return regExp.test(type)
}

const isPublic = (type = '') => {
  return publicCollRegExp.test(type)
}

const isHidden = (type = '') => {
  return hiddenCollRegExp.test(type)
}

const isUpdatable = (type = '') => {
  return updatableCollRegExp.test(type)
}

const _getStartPattern = (opts) => {
  const {
    isPublic,
    isPrivate
  } = opts ?? {}

  if (isPrivate) {
    return '^'
  }
  if (isPublic) {
    return `^${PUBLIC}${SEPARATOR}`
  }

  return ''
}

const _getRegExp = (type = '', opts) => {
  const startPattern = _getStartPattern(opts)

  return new RegExp(`${startPattern}${type}$`, 'i')
}

module.exports = {
  isInsertableArrObj,
  isUpdatableArrObj,
  isUpdatableArr,
  isPublic,
  isHidden,
  isUpdatable
}
