'use strict'

const {
  pick,
  isEmpty
} = require('lodash')

const {
  isSubAccountApiKeys
} = require('../../../helpers')

const invertSort = (sortArr) => {
  return sortArr.map(item => {
    const _arr = [...item]

    _arr[1] = item[1] > 0 ? -1 : 1

    return _arr
  })
}

const filterMethodCollMap = (
  methodCollMap,
  isPublic
) => {
  return new Map([...methodCollMap].filter(([key, schema]) => {
    const _isHidden = /^hidden:/i.test(schema.type)

    if (_isHidden) return false

    const _isPub = /^public:/i.test(schema.type)

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

const getAuthFromDb = async (authenticator) => {
  try {
    const auth = new Map()
    const sessions = await authenticator.getUserSessions(
      { isFilledUsers: true }
    )

    if (sessions.size === 0) {
      return auth
    }

    for (const [, session] of sessions) {
      const {
        _id,
        email,
        apiKey,
        apiSecret,
        isSubAccount,
        subUsers,
        jwt
      } = { ...session }
      const authPayload = {
        _id,
        email,
        apiKey,
        apiSecret,
        isSubAccount,
        subUsers,
        jwt,
        subUser: null
      }

      if (!isSubAccount) {
        auth.set(apiKey, authPayload)

        continue
      }
      if (
        !Array.isArray(subUsers) ||
        subUsers.length === 0
      ) {
        continue
      }

      subUsers.forEach((subUser) => {
        const { apiKey: subUserApiKey } = { ...subUser }

        auth.set(
          `${apiKey}-${subUserApiKey}`,
          { ...authPayload, subUser }
        )
      })
    }

    return auth
  } catch (err) {
    return null
  }
}

const getAllowedCollsNames = (allowedColls) => {
  return Object.values(allowedColls)
    .filter(name => !(/^_.*/.test(name)))
}

const addPropsToResIfExist = (
  args = {},
  apiRes = [],
  props = []
) => {
  const { params } = { ...args }
  const isApiResObject = (
    apiRes &&
    typeof apiRes === 'object' &&
    !Array.isArray(apiRes)
  )
  const incomingRes = (
    isApiResObject &&
    Array.isArray(apiRes.res)
  )
    ? apiRes.res
    : apiRes
  const isEmptyProps = props.every(({ from, to }) => {
    return (
      typeof to !== 'string' ||
      typeof from !== 'string' ||
      typeof params[from] === 'undefined'
    )
  })

  if (
    !Array.isArray(incomingRes) ||
    isEmptyProps
  ) {
    return apiRes
  }

  const res = incomingRes.map((item) => {
    const additionalProps = props.reduce((accum, { from, to }) => {
      if (
        typeof to !== 'string' ||
        typeof from !== 'string' ||
        typeof params[from] === 'undefined'
      ) {
        return accum
      }

      return {
        ...accum,
        [to]: params[from]
      }
    }, {})

    return {
      ...item,
      ...additionalProps
    }
  })

  return isApiResObject
    ? { ...apiRes, res }
    : res
}

module.exports = {
  invertSort,
  filterMethodCollMap,
  checkCollType,
  compareElemsDbAndApi,
  normalizeApiData,
  getAuthFromDb,
  getAllowedCollsNames,
  addPropsToResIfExist
}
