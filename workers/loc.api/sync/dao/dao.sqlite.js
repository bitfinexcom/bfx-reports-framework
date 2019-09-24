'use strict'

const {
  isEmpty,
  pick,
  omit
} = require('lodash')
const {
  decorate,
  injectable,
  inject
} = require('inversify')
const {
  getLimitNotMoreThan,
  checkFilterParams
} = require('bfx-report/workers/loc.api/helpers')
const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const TYPES = require('../../di/types')

const DAO = require('./dao')
const {
  checkParamsAuth,
  refreshObj,
  mapObjBySchema
} = require('../../helpers')
const {
  mixUserIdToArrData,
  convertDataType,
  getWhereQuery,
  getLimitQuery,
  getOrderQuery,
  getUniqueIndexQuery,
  getInsertableArrayObjectsFilter,
  getProjectionQuery,
  getPlaceholdersQuery,
  serializeVal,
  getGroupQuery,
  getSubQuery,
  filterModelNameMap
} = require('./helpers')
const {
  RemoveListElemsError,
  UpdateStateCollError,
  UpdateSyncProgressError
} = require('../../errors')

class SqliteDAO extends DAO {
  _run (sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err)

          return
        }

        resolve(this)
      })
    })
  }

  _get (sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, result) => {
        if (err) {
          reject(err)

          return
        }

        resolve(result)
      })
    })
  }

  _all (sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)

          return
        }

        resolve(rows)
      })
    })
  }

  _commit () {
    return this._run('COMMIT')
  }

  _rollback () {
    return this._run('ROLLBACK')
  }

  _beginTrans (asyncExecQuery) {
    return new Promise((resolve, reject) => {
      this.db.serialize(async () => {
        let isTransBegun = false

        try {
          await this._run('BEGIN TRANSACTION')
          isTransBegun = true

          await asyncExecQuery()
          await this._commit()

          resolve()
        } catch (err) {
          if (isTransBegun) {
            await this._rollback()
          }

          reject(err)
        }
      })
    })
  }

  async _createTablesIfNotExists () {
    for (const [name, model] of this._getModelsMap()) {
      const keys = Object.keys(model)
      const columnDefs = keys.reduce((accum, field, i, arr) => {
        const isLast = arr.length === (i + 1)
        const type = model[field].replace(/[#]\{field\}/g, field)

        return `${accum}${field} ${type}${isLast ? '' : ', \n'}`
      }, '')

      const sql = `CREATE TABLE IF NOT EXISTS ${name} (
        ${columnDefs}
        )`

      await this._run(sql)
    }
  }

  async _createIndexisIfNotExists () {
    for (const currItem of this._getMethodCollMap()) {
      const item = currItem[1]

      if (item.type === 'insertable:array:objects') {
        const sql = `CREATE INDEX IF NOT EXISTS
          ${item.name}_${item.dateFieldName}_${item.symbolFieldName}
          ON ${item.name}(${item.dateFieldName}, ${item.symbolFieldName})`

        await this._run(sql)
      }

      if (
        item.fieldsOfUniqueIndex &&
        Array.isArray(item.fieldsOfUniqueIndex)
      ) {
        const sql = getUniqueIndexQuery(item.name, item.fieldsOfUniqueIndex)

        await this._run(sql)
      }
    }

    const publicСollsСonfSql = getUniqueIndexQuery(
      'publicСollsСonf',
      ['symbol', 'user_id', 'confName']
    )

    await this._run(publicСollsСonfSql)
  }

  async _getUserByAuth (auth) {
    const sql = `SELECT * FROM users
      WHERE users.apiKey = $apiKey
      AND users.apiSecret = $apiSecret`

    const res = await this._get(sql, {
      $apiKey: auth.apiKey,
      $apiSecret: auth.apiSecret
    })

    if (res && typeof res === 'object') {
      res.active = !!res.active
      res.isDataFromDb = !!res.isDataFromDb
    }

    return res
  }

  /**
   * @override
   */
  async databaseInitialize (db) {
    super.databaseInitialize(db)

    await this._beginTrans(async () => {
      await this._createTablesIfNotExists()
      await this._createIndexisIfNotExists()
    })
  }

  /**
   * @override
   */
  async getLastElemFromDb (name, auth, sort = []) {
    const _sort = getOrderQuery(sort)

    const sql = `SELECT ${name}.* FROM ${name}
      INNER JOIN users ON users._id = ${name}.user_id
      WHERE users.apiKey = $apiKey
      AND users.apiSecret = $apiSecret
      ${_sort}`

    return this._get(sql, {
      $apiKey: auth.apiKey,
      $apiSecret: auth.apiSecret
    })
  }

  /**
   * @override
   */
  async insertElemsToDb (
    name,
    auth,
    data = [],
    {
      isReplacedIfExists
    } = {}
  ) {
    await mixUserIdToArrData(this, auth, data)

    await this._beginTrans(async () => {
      for (const obj of data) {
        const keys = Object.keys(obj)

        if (keys.length === 0) {
          continue
        }

        const projection = getProjectionQuery(keys)
        const {
          placeholders,
          placeholderVal
        } = getPlaceholdersQuery(obj, keys)
        const replace = isReplacedIfExists
          ? ' OR REPLACE'
          : ''

        const sql = `INSERT${replace} INTO ${name}(${projection}) VALUES (${placeholders})`

        await this._run(sql, placeholderVal)
      }
    })
  }

  /**
   * @override
   */
  async insertElemsToDbIfNotExists (name, auth, data = []) {
    await mixUserIdToArrData(this, auth, data)

    await this._beginTrans(async () => {
      for (const obj of data) {
        const keys = Object.keys(obj)

        if (keys.length === 0) {
          continue
        }

        const _obj = keys.reduce((accum, key) => ({
          ...accum,
          [key]: serializeVal(obj[key])
        }), {})
        const projection = getProjectionQuery(keys)
        const {
          where,
          values
        } = getWhereQuery(_obj)
        const {
          placeholders,
          placeholderVal
        } = getPlaceholdersQuery(_obj, keys)

        const sql = `INSERT INTO ${name}(${projection}) SELECT ${placeholders}
                      WHERE NOT EXISTS(SELECT 1 FROM ${name} ${where})`

        await this._run(sql, { ...values, ...placeholderVal })
      }
    })
  }

  /**
   * @override
   */
  async checkAuthInDb (args, isCheckActiveState = true) {
    checkParamsAuth(args)

    const user = await this._getUserByAuth(args.auth)

    if (
      isEmpty(user) ||
      (isCheckActiveState && !user.active)
    ) {
      throw new AuthError()
    }

    return user
  }

  /**
   * @override
   */
  async findInCollBy (
    method,
    args,
    {
      isPrepareResponse = false,
      isPublic = false,
      additionalModel,
      schema = {},
      isExcludePrivate = true
    } = {}
  ) {
    const filterModelName = filterModelNameMap.get(method)

    checkFilterParams(filterModelName, args)

    const user = isPublic ? null : await this.checkAuthInDb(args)
    const methodColl = {
      ...this._getMethodCollMap().get(method),
      ...schema
    }
    const params = { ...args.params }
    const {
      maxLimit,
      dateFieldName,
      symbolFieldName,
      sort: _sort,
      model,
      dataStructureConverter,
      name
    } = { ...methodColl }
    params.limit = maxLimit
      ? getLimitNotMoreThan(params.limit, maxLimit)
      : null
    const _model = { ...model, ...additionalModel }

    const exclude = ['_id']
    const filter = getInsertableArrayObjectsFilter(
      methodColl,
      params
    )

    if (!isPublic) {
      exclude.push('user_id')
      filter.user_id = user._id
    }

    const {
      limit,
      limitVal
    } = getLimitQuery(params)
    const sort = getOrderQuery(_sort)
    const {
      where,
      values
    } = getWhereQuery(filter)
    const group = getGroupQuery(methodColl)
    const subQuery = getSubQuery(methodColl)
    const projection = getProjectionQuery(
      _model,
      exclude,
      isExcludePrivate
    )

    const sql = `SELECT ${projection} FROM ${subQuery}
      ${where}
      ${group}
      ${sort}
      ${limit}`

    const _res = await this._all(sql, { ...values, ...limitVal })
    const convertedDataStructure = (
      typeof dataStructureConverter === 'function'
    )
      ? _res.reduce(methodColl.dataStructureConverter, [])
      : _res
    const res = convertDataType(convertedDataStructure)

    if (isPrepareResponse) {
      const symbols = (
        params.symbol &&
        Array.isArray(params.symbol) &&
        params.symbol.length > 1
      ) ? params.symbol : []

      return this.prepareResponse(
        res,
        dateFieldName,
        params.limit,
        params.notThrowError,
        params.notCheckNextPage,
        symbols,
        symbolFieldName,
        name
      )
    }

    return res
  }

  /**
   * @override
   */
  async getActiveUsers () {
    const sql = 'SELECT * FROM users WHERE active = 1'

    const res = await this._all(sql)

    return res.map(item => {
      item.active = !!item.active

      return item
    })
  }

  /**
   * @override
   */
  async updateCollBy (name, filter = {}, data = {}) {
    const {
      where,
      values
    } = getWhereQuery(filter)
    const fields = Object.keys(data).map(item => {
      const key = `$new_${item}`
      values[key] = data[item]

      return `${item} = ${key}`
    }).join(', ')

    const sql = `UPDATE ${name} SET ${fields} ${where}`

    return this._run(sql, values)
  }

  /**
   * @override
   */
  async updateElemsInCollBy (
    name,
    data = [],
    filterPropNames = {},
    upPropNames = {}
  ) {
    await this._beginTrans(async () => {
      for (const item of data) {
        await this.updateCollBy(
          name,
          mapObjBySchema(item, filterPropNames),
          mapObjBySchema(item, upPropNames)
        )
      }
    })
  }

  /**
   * @override
   */
  async insertOrUpdateUser (data) {
    const user = await this._getUserByAuth(data)

    if (isEmpty(user)) {
      if (!data.email) {
        throw new AuthError()
      }

      await this.insertElemsToDb(
        'users',
        null,
        [{
          ...pick(
            data,
            [
              'apiKey',
              'apiSecret',
              'email',
              'timezone',
              'username',
              'id'
            ]
          ),
          active: 1,
          isDataFromDb: 1
        }]
      )

      return this._getUserByAuth(data)
    }

    const newData = { active: 1 }

    refreshObj(
      user,
      newData,
      data,
      ['email', 'timezone', 'username', 'id']
    )

    const res = await this.updateCollBy(
      'users',
      { _id: user._id },
      omit(newData, ['_id'])
    )

    if (res && res.changes < 1) {
      throw new AuthError()
    }

    return {
      ...user,
      ...newData
    }
  }

  /**
   * @override
   */
  async updateUserByAuth (data) {
    const props = ['apiKey', 'apiSecret']
    const res = await this.updateCollBy(
      'users',
      pick(data, props),
      omit(data, [...props, '_id'])
    )

    if (res && res.changes < 1) {
      throw new AuthError()
    }

    return res
  }

  /**
   * @override
   */
  async deactivateUser (auth) {
    const res = await this.updateUserByAuth({
      ...pick(auth, ['apiKey', 'apiSecret']),
      active: 0
    })

    return res
  }

  /**
   * @override
   */
  getElemsInCollBy (
    collName,
    {
      filter = {},
      sort = [],
      minPropName = null,
      groupPropName = null,
      isDistinct = false,
      projection = [],
      exclude = [],
      isExcludePrivate = false,
      limit = null
    } = {}
  ) {
    const subQuery = (
      minPropName &&
      typeof minPropName === 'string' &&
      groupPropName &&
      typeof groupPropName === 'string'
    ) ? `${minPropName} = (SELECT MIN(${minPropName}) FROM ${collName} AS b
        WHERE b.${groupPropName} = a.${groupPropName})
        GROUP BY ${groupPropName}`
      : ''

    const _sort = getOrderQuery(sort)
    const {
      where,
      values
    } = getWhereQuery(filter, true)
    const _projection = getProjectionQuery(
      projection,
      exclude,
      isExcludePrivate
    )
    const distinct = isDistinct ? 'DISTINCT ' : ''
    const {
      limit: _limit,
      limitVal
    } = getLimitQuery({ limit })

    const sql = `SELECT ${distinct}${_projection} FROM ${collName} AS a
      ${where || subQuery ? ' WHERE ' : ''}${where}${where && subQuery ? ' AND ' : ''}${subQuery}
      ${_sort}
      ${_limit}`

    return this._all(sql, { ...values, ...limitVal })
  }

  /**
   * @override
   */
  getElemInCollBy (collName, filter = {}, sort = []) {
    const _sort = getOrderQuery(sort)
    const {
      where,
      values
    } = getWhereQuery(filter)

    const sql = `SELECT * FROM ${collName}
      ${where}
      ${_sort}`

    return this._get(sql, values)
  }

  /**
   * @override
   */
  async removeElemsFromDb (name, auth, data = {}) {
    if (auth) {
      const user = await this.checkAuthInDb({ auth })

      data.user_id = user._id
    }
    const {
      where,
      values
    } = getWhereQuery(data)

    const sql = `DELETE FROM ${name} ${where}`

    return this._run(sql, values)
  }

  /**
   * @override
   */
  async removeElemsFromDbIfNotInLists (name, lists) {
    const areAllListsNotArr = Object.keys(lists).every(key => (
      !Array.isArray(lists[key])
    ))

    if (areAllListsNotArr) {
      throw new RemoveListElemsError()
    }

    const $or = Object.entries(lists).reduce((accum, [key, val]) => {
      return {
        $not: {
          ...accum.$not,
          [key]: val
        }
      }
    }, { $not: {} })
    const {
      where,
      values
    } = getWhereQuery({ $or })

    const sql = `DELETE FROM ${name} ${where}`

    await this._run(sql, values)
  }

  /**
   * @override
   */
  async updateStateOf (name, isEnable = 1) {
    const elems = await this.getElemsInCollBy(name)
    const data = {
      isEnable: isEnable ? 1 : 0
    }

    if (elems.length > 1) {
      await this.removeElemsFromDb(name, null, {
        _id: elems.filter((item, i) => i !== 0)
      })
    }

    if (isEmpty(elems)) {
      return this.insertElemsToDb(
        name,
        null,
        [data]
      )
    }

    const res = await this.updateCollBy(
      name,
      { _id: elems[0]._id },
      data
    )

    if (res && res.changes < 1) {
      throw new UpdateStateCollError()
    }

    return res
  }

  /**
   * @override
   */
  getFirstElemInCollBy (collName, filter = {}) {
    const {
      where,
      values
    } = getWhereQuery(filter)

    const sql = `SELECT * FROM ${collName} ${where}`

    return this._get(sql, values)
  }

  /**
   * @override
   */
  async updateProgress (value) {
    const name = 'progress'
    const elems = await this.getElemsInCollBy(name)
    const data = {
      value: JSON.stringify(value)
    }

    if (elems.length > 1) {
      await this.removeElemsFromDb(name, null, {
        _id: elems.filter((item, i) => i !== 0)
      })
    }

    if (isEmpty(elems)) {
      return this.insertElemsToDb(
        name,
        null,
        [data]
      )
    }

    const res = await this.updateCollBy(
      name,
      { _id: elems[0]._id },
      data
    )

    if (res && res.changes < 1) {
      throw new UpdateSyncProgressError()
    }

    return res
  }

  /**
   * @override
   */
  async getCountBy (name, filter = {}) {
    const {
      where,
      values
    } = getWhereQuery(filter)

    const sql = `SELECT count(*) AS res FROM ${name} ${where}`
    const { res } = await this._get(sql, values)

    return res
  }
}

decorate(injectable(), SqliteDAO)
decorate(inject(TYPES.DB), SqliteDAO, 0)
decorate(inject(TYPES.SyncSchema), SqliteDAO, 1)
decorate(inject(TYPES.PrepareResponse), SqliteDAO, 2)

module.exports = SqliteDAO
