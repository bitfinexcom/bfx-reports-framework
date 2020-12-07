'use strict'

const { pick } = require('lodash')

module.exports = (
  data,
  projection,
  opts
) => {
  if (
    !Array.isArray(projection) ||
    projection.length === 0
  ) {
    return data
  }

  const {
    isAppliedProjectionToSubUser,
    subUsersProjection = projection
  } = { ...opts }

  const isArray = Array.isArray(data)
  const dataArr = isArray ? data : [data]

  const res = dataArr.map((item) => {
    if (!item || typeof item !== 'object') {
      return item
    }

    if (
      !isAppliedProjectionToSubUser ||
      !Array.isArray(subUsersProjection) ||
      subUsersProjection.length === 0 ||
      !Array.isArray(item.subUsers) ||
      item.subUsers.length === 0
    ) {
      return pick(item, projection)
    }

    const subUsers = item.subUsers.map((subUser) => {
      if (!subUser || typeof subUser !== 'object') {
        return subUser
      }

      return pick(subUser, subUsersProjection)
    })

    return pick({ ...item, subUsers }, projection)
  })

  return isArray ? res : res[0]
}
