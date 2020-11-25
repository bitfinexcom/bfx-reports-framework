'use strict'

const _getData = (params) => {
  if (Array.isArray(params)) {
    return params
  }
  if (
    params &&
    typeof params === 'object' &&
    params.data &&
    (
      typeof params.data !== 'undefined' ||
      typeof params.transVersion !== 'undefined'
    )
  ) {
    return params.data
  }

  return params
}

const _execTransaction = (trx, params) => {
  const transVersions = [
    'deferred',
    'immediate',
    'exclusive'
  ]
  const data = _getData(params)

  if (
    params &&
    typeof params === 'object' &&
    params.transVersion &&
    typeof params.transVersion === 'string' &&
    transVersions.some((ver) => ver === params.transVersion)
  ) {
    const nested = trx[params.transVersion].bind(trx)

    return nested(data)
  }

  return trx(data)
}

const _getInfo = (newInfo, oldInfo) => {
  const { changes: newChanges = 0 } = { ...newInfo }
  const { changes: oldChanges = 0 } = { ...oldInfo }

  const changes = newChanges + oldChanges

  return { changes }
}

const _runStm = (stm, param, oldInfo) => {
  const newInfo = typeof param === 'undefined'
    ? stm.run()
    : stm.run(param)

  return _getInfo(newInfo, oldInfo)
}

module.exports = (db, sql, params) => {
  const isSqlArray = Array.isArray(sql)
  const sqlArr = isSqlArray ? sql : [sql]
  const stms = sqlArr.map((sql) => db.prepare(sql))

  const trx = db.transaction((items) => {
    let info = { changes: 0 }

    if (!Array.isArray(items)) {
      if (!isSqlArray) {
        return _runStm(stms[0], items, info)
      }

      for (const stm of stms) {
        info = _runStm(stm, items, info)
      }

      return info
    }

    for (const [i, item] of items.entries()) {
      if (!isSqlArray) {
        info = _runStm(stms[0], item, info)

        continue
      }

      info = _runStm(stms[i], item, info)
    }

    return info
  })

  return _execTransaction(trx, params)
}
