'use strict'

const {
  getUsersQuery,
  getSubUsersQuery,
  getUsersIds,
  normalizeUserData,
  fillSubUsers
} = require('../../helpers/users')

const _allStm = (stm, param) => {
  return typeof param === 'undefined'
    ? stm.all()
    : stm.all(param)
}

const _getStm = (stm, param) => {
  return typeof param === 'undefined'
    ? stm.get()
    : stm.get(param)
}

const _fillSubUsers = (db, users) => {
  const isArray = Array.isArray(users)
  const _users = isArray ? users : [users]
  const usersIds = getUsersIds(_users)

  if (usersIds.length === 0) {
    return users
  }

  const { sql, values } = getSubUsersQuery(
    { $in: { _id: usersIds } },
    { sort: ['_id'] }
  )
  const stm = db.prepare(sql)
  const res = _allStm(stm, values)

  const _subUsers = normalizeUserData(res)
  const filledUsers = fillSubUsers(_users, _subUsers)

  return isArray ? filledUsers : filledUsers[0]
}

module.exports = (db, sql, params) => {
  const { filter, opts } = { ...params }
  const {
    isNotInTrans,
    isFoundOne,
    haveNotSubUsers,
    haveSubUsers,
    isFilledSubUsers,
    sort = ['_id'],
    limit
  } = { ...opts }

  const { sql: usersQuery, values } = getUsersQuery(
    filter,
    {
      isFoundOne,
      haveNotSubUsers,
      haveSubUsers,
      sort,
      limit
    }
  )
  const getUsersStm = db.prepare(usersQuery)
  const queryUsersFn = () => {
    const _res = isFoundOne
      ? _getStm(getUsersStm, values)
      : _allStm(getUsersStm, values)

    if (!_res || typeof _res !== 'object') {
      return _res
    }

    const res = normalizeUserData(_res)
    const usersFilledSubUsers = isFilledSubUsers
      ? _fillSubUsers(db, res)
      : res

    return usersFilledSubUsers
  }

  if (isNotInTrans) {
    return queryUsersFn()
  }

  const trx = db.transaction(queryUsersFn)

  return trx()
}
