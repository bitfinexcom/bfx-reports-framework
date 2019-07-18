'use strict'

const {
  pick,
  isEmpty
} = require('lodash')

const invertSort = (sortArr) => {
  return sortArr.map(item => {
    const _arr = [ ...item ]

    _arr[1] = item[1] > 0 ? -1 : 1

    return _arr
  })
}

const filterMethodCollMap = (
  methodCollMap,
  isPublic
) => {
  return new Map([...methodCollMap].filter(([key, schema]) => {
    const _isPub = /^public:.*/i.test(schema.type)

    return schema.hasNewData && (isPublic ? _isPub : !_isPub)
  }))
}

const checkCollType = (
  type,
  coll,
  isPublic
) => {
  const _pub = isPublic ? 'public:' : ''
  const regExp = new RegExp(`^${_pub}${type}$`, 'i')

  return regExp.test(coll.type)
}

const compareElemsDbAndApi = (
  dateFieldName,
  elDb,
  elApi
) => {
  const _elDb = Array.isArray(elDb) ? elDb[0] : elDb
  const _elApi = Array.isArray(elApi) ? elApi[0] : elApi

  return (_elDb[dateFieldName] < _elApi[dateFieldName])
    ? _elDb[dateFieldName]
    : false
}

const normalizeApiData = (
  data = [],
  model,
  cb = () => {}
) => {
  return data.map(item => {
    if (
      typeof item !== 'object' ||
      typeof model !== 'object' ||
      Object.keys(model).length === 0
    ) {
      return item
    }

    cb(item)

    return pick(item, Object.keys(model))
  })
}

const getAuthFromDb = async (dao) => {
  try {
    const users = await dao.getActiveUsers()
    const auth = new Map()

    if (isEmpty(users)) {
      return auth
    }

    users.forEach(user => {
      auth.set(
        user.apiKey,
        {
          apiKey: user.apiKey,
          apiSecret: user.apiSecret
        }
      )
    })

    return auth
  } catch (err) {
    return null
  }
}

const getAllowedCollsNames = (allowedColls) => {
  return Object.values(allowedColls)
    .filter(name => !(/^_.*/.test(name)))
}

module.exports = {
  invertSort,
  filterMethodCollMap,
  checkCollType,
  compareElemsDbAndApi,
  normalizeApiData,
  getAuthFromDb,
  getAllowedCollsNames
}
