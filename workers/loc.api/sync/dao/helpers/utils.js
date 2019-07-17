'use strict'

const { deserializeVal } = require('./serialization')

const mixUserIdToArrData = async (dao, auth, data = []) => {
  if (auth) {
    const user = await dao.checkAuthInDb({ auth })

    data.forEach(item => {
      item.user_id = user._id
    })
  }
}

const convertDataType = (
  arr = [],
  boolFields
) => {
  arr.forEach(obj => {
    Object.keys(obj).forEach(key => {
      if (
        obj &&
        typeof obj === 'object'
      ) {
        obj[key] = deserializeVal(
          obj[key],
          key,
          boolFields
        )
      }
    })
  })

  return arr
}

module.exports = {
  mixUserIdToArrData,
  convertDataType
}
