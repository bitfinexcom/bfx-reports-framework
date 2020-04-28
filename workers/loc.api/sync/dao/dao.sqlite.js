'use strict'

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
  mixUserIdToArrData,
  convertDataType,
  mapObjBySchema,
  getWhereQuery,
  getLimitQuery,
  getOrderQuery,
  getIndexQuery,
  getInsertableArrayObjectsFilter,
  getStatusMessagesFilter,
  getProjectionQuery,
  getPlaceholdersQuery,
  serializeVal,
  getGroupQuery,
  getSubQuery,
  filterModelNameMap,
  getTableCreationQuery,
  getTriggerCreationQuery
} = require('./helpers')
const {
  RemoveListElemsError,
  UpdateRecordError,
  SqlCorrectnessError,
  DbVersionTypeError
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

  _beginTrans (
    asyncExecQuery,
    {
      beforeTransFn,
      afterTransFn
    } = {}
  ) {
    return new Promise((resolve, reject) => {
      this.db.serialize(async () => {
        let isTransBegun = false

        try {
          if (typeof beforeTransFn === 'function') {
            await beforeTransFn()
          }

          await this._run('BEGIN TRANSACTION')
          isTransBegun = true

          const res = await asyncExecQuery()
          await this._commit()

          if (typeof afterTransFn === 'function') {
            await afterTransFn()
          }

          resolve(res)
        } catch (err) {
          try {
            if (isTransBegun) {
              await this._rollback()
            }
            if (typeof afterTransFn === 'function') {
              await afterTransFn()
            }
          } catch (err) {
            reject(err)

            return
          }

          reject(err)
        }
      })
    })
  }

  async _createTablesIfNotExists () {
    const models = this._getModelsMap({ omittedFields: null })
    const sqlArr = getTableCreationQuery(models, true)

    for (const sql of sqlArr) {
      await this._run(sql)
    }
  }

  async _createTriggerIfNotExists () {
    const models = this._getModelsMap({ omittedFields: null })
    const sqlArr = getTriggerCreationQuery(models, true)

    for (const sql of sqlArr) {
      await this._run(sql)
    }
  }

  async _createIndexisIfNotExists () {
    for (const currItem of this._getMethodCollMap()) {
      const syncSchema = currItem[1]
      const {
        name,
        fieldsOfIndex,
        fieldsOfUniqueIndex
      } = syncSchema

      const indexSql = getIndexQuery(fieldsOfIndex, { name })
      const uniqueIndexSql = getIndexQuery(
        fieldsOfUniqueIndex,
        { name, isUnique: true }
      )
      const sqlArr = [...indexSql, ...uniqueIndexSql]

      for (const sql of sqlArr) {
        await this._run(sql)
      }
    }

    const publicСollsСonfSql = getIndexQuery(
      ['symbol', 'user_id', 'confName', 'timeframe'],
      { name: this.TABLES_NAMES.PUBLIC_COLLS_CONF, isUnique: true }
    )
    const userSql = getIndexQuery(
      ['email', 'username'],
      { name: this.TABLES_NAMES.USERS, isUnique: true }
    )
    const sqlArr = [...publicСollsСonfSql, ...userSql]

    for (const sql of sqlArr) {
      await this._run(sql)
    }
  }

  async _getUsers (
    filter,
    {
      isNotInTrans,
      isFoundOne,
      haveNotSubUsers,
      haveSubUsers,
      isFilledSubUsers,
      sort = ['_id'],
      limit
    } = {}
  ) {
    const userTableAlias = 'u'
    const {
      limit: _limit,
      limitVal
    } = getLimitQuery({ limit: isFoundOne ? null : limit })
    const {
      where,
      values: _values
    } = getWhereQuery(filter, true, null, userTableAlias)
    const haveSubUsersQuery = haveSubUsers
      ? 'sa.subUserId IS NOT NULL'
      : ''
    const haveNotSubUsersQuery = haveNotSubUsers
      ? 'sa.subUserId IS NULL'
      : ''
    const whereQueries = [
      where,
      haveSubUsersQuery,
      haveNotSubUsersQuery
    ].filter((query) => query).join(' AND ')
    const _where = whereQueries ? `WHERE ${whereQueries}` : ''
    const _sort = getOrderQuery(sort)
    const group = `GROUP BY ${userTableAlias}._id`
    const values = { ..._values, ...limitVal }

    const sql = `SELECT ${userTableAlias}.*, sa.subUserId as haveSubUsers
      FROM ${this.TABLES_NAMES.USERS} AS ${userTableAlias}
      LEFT JOIN ${this.TABLES_NAMES.SUB_ACCOUNTS} AS sa
        ON ${userTableAlias}._id = sa.masterUserId
      ${_where}
      ${group}
      ${_sort}
      ${_limit}`

    const queryUsersFn = async () => {
      const _res = isFoundOne
        ? await this._get(sql, values)
        : await this._all(sql, values)

      if (
        !_res &&
        typeof _res !== 'object'
      ) {
        return _res
      }

      const res = isFoundOne
        ? {
          ..._res,
          active: !!_res.active,
          isDataFromDb: !!_res.isDataFromDb,
          isSubAccount: !!_res.isSubAccount,
          isSubUser: !!_res.isSubUser,
          haveSubUsers: !!_res.haveSubUsers
        }
        : _res.map((user) => {
          const {
            active,
            isDataFromDb,
            isSubAccount,
            isSubUser,
            haveSubUsers
          } = { ...user }

          return {
            ...user,
            active: !!active,
            isDataFromDb: !!isDataFromDb,
            isSubAccount: !!isSubAccount,
            isSubUser: !!isSubUser,
            haveSubUsers: !!haveSubUsers
          }
        })

      const usersFilledSubUsers = isFilledSubUsers
        ? await this._fillSubUsers(res)
        : res

      return usersFilledSubUsers
    }

    if (isNotInTrans) {
      return queryUsersFn()
    }

    return this._beginTrans(queryUsersFn)
  }

  async _fillSubUsers (users) {
    const isArray = Array.isArray(users)
    const _users = isArray ? users : [users]
    const usersIds = _users
      .filter((user) => {
        const { _id } = { ...user }

        return Number.isInteger(_id)
      })
      .map(({ _id }) => _id)

    if (usersIds.length === 0) {
      return users
    }

    const _subUsers = await this._getSubUsersByMasterUser(
      { $in: { _id: usersIds } }
    )

    const filledUsers = _users.map((user) => {
      const { _id } = { ...user }
      const subUsers = _subUsers.filter((subUser) => {
        const { masterUserId } = { ...subUser }

        return (
          Number.isInteger(masterUserId) &&
          masterUserId === _id
        )
      })

      return {
        ...user,
        subUsers
      }
    })

    return isArray ? filledUsers : filledUsers[0]
  }

  async _getSubUsersByMasterUser (
    masterUser,
    sort = ['_id']
  ) {
    const tableAlias = 'mu'
    const {
      where,
      values
    } = getWhereQuery(masterUser, false, null, tableAlias)
    const _sort = getOrderQuery(sort)

    const sql = `SELECT su.*, ${tableAlias}._id AS masterUserId
      FROM ${this.TABLES_NAMES.USERS} AS su
      INNER JOIN ${this.TABLES_NAMES.SUB_ACCOUNTS} AS sa
        ON su._id = sa.subUserId
      INNER JOIN ${this.TABLES_NAMES.USERS} AS ${tableAlias}
        ON ${tableAlias}._id = sa.masterUserId
      ${where}
      ${_sort}`

    const res = await this._all(sql, values)

    return res.map((user) => {
      const {
        active,
        isDataFromDb,
        isSubAccount,
        isSubUser
      } = { ...user }

      return {
        ...user,
        active: !!active,
        isDataFromDb: !!isDataFromDb,
        isSubAccount: !!isSubAccount,
        isSubUser: !!isSubUser
      }
    })
  }

  async getTablesNames () {
    const data = await this._all(
      `SELECT name FROM sqlite_master
        WHERE type='table' AND
        name NOT LIKE 'sqlite_%'
        ORDER BY name`
    )

    if (!Array.isArray(data)) {
      return []
    }

    return data.map(({ name }) => name)
  }

  enableForeignKeys () {
    return this._run('PRAGMA foreign_keys = ON')
  }

  disableForeignKeys () {
    return this._run('PRAGMA foreign_keys = OFF')
  }

  dropTable (name, isDroppedIfExists) {
    if (
      !name ||
      typeof name !== 'string'
    ) {
      throw new SqlCorrectnessError()
    }

    const condition = isDroppedIfExists
      ? ' IF EXISTS'
      : ''

    return this._run(`DROP TABLE${condition} ${name}`)
  }

  /**
   * @override
   */
  beforeMigrationHook () {
    return this.enableForeignKeys()
  }

  /**
   * @override
   */
  async databaseInitialize (db) {
    await super.databaseInitialize(db)

    await this._beginTrans(async () => {
      await this._createTablesIfNotExists()
      await this._createIndexisIfNotExists()
      await this._createTriggerIfNotExists()
      await this.setCurrDbVer(this.syncSchema.SUPPORTED_DB_VERSION)
    })
  }

  /**
   * @override
   */
  async isDBEmpty () {
    const tablesNames = await this.getTablesNames()

    return (
      !Array.isArray(tablesNames) ||
      tablesNames.length === 0
    )
  }

  /**
   * @override
   */
  async getCurrDbVer () {
    const data = await this._get('PRAGMA user_version')
    const { user_version: version } = { ...data }

    return version
  }

  /**
   * @override
   */
  async setCurrDbVer (version) {
    if (!Number.isInteger(version)) {
      throw new DbVersionTypeError()
    }

    this._run(`PRAGMA user_version = ${version}`)
  }

  /**
   * @override
   */
  async executeQueriesInTrans (
    sql,
    {
      beforeTransFn,
      afterTransFn
    } = {}
  ) {
    const sqlArr = Array.isArray(sql)
      ? sql
      : [sql]

    if (sqlArr.length === 0) {
      return
    }

    return this._beginTrans(async () => {
      for (const sqlData of sqlArr) {
        const _sqlObj = typeof sqlData === 'string'
          ? { sql: sqlData }
          : sqlData
        const sqlObj = typeof _sqlObj === 'function'
          ? { execQueryFn: _sqlObj }
          : _sqlObj
        const { sql, values, execQueryFn } = { ...sqlObj }

        if (
          (!sql || typeof sql !== 'string') &&
          typeof execQueryFn !== 'function'
        ) {
          throw new SqlCorrectnessError()
        }

        if (sql) {
          await this._run(sql, values)
        }
        if (execQueryFn) {
          await execQueryFn()
        }
      }
    }, { beforeTransFn, afterTransFn })
  }

  /**
   * @override
   */
  async insertElemToDb (
    name,
    obj = {},
    {
      isReplacedIfExists
    } = {}
  ) {
    const keys = Object.keys(obj)
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

  /**
   * @override
   */
  async insertElemsToDb (
    name,
    auth,
    data = [],
    { isReplacedIfExists } = {}
  ) {
    const _data = mixUserIdToArrData(
      auth,
      data
    )

    await this._beginTrans(async () => {
      for (const obj of _data) {
        const keys = Object.keys(obj)

        if (keys.length === 0) {
          continue
        }

        await this.insertElemToDb(
          name,
          obj,
          { isReplacedIfExists }
        )
      }
    })
  }

  /**
   * @override
   */
  async insertElemsToDbIfNotExists (
    name,
    auth,
    data = []
  ) {
    const _data = mixUserIdToArrData(
      auth,
      data
    )

    await this._beginTrans(async () => {
      for (const obj of _data) {
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

    const { auth: user } = { ...args }
    const methodColl = {
      ...this._getMethodCollMap().get(method),
      ...schema
    }
    const params = { ...args.params }
    const { filter: requestedFilter } = params
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
    const statusMessagesfilter = getStatusMessagesFilter(
      methodColl,
      params
    )
    const insertableArrayObjectsFilter = getInsertableArrayObjectsFilter(
      methodColl,
      params
    )
    const filter = {
      ...insertableArrayObjectsFilter,
      ...statusMessagesfilter
    }

    if (!isPublic) {
      const { _id } = { ...user }

      if (!Number.isInteger(_id)) {
        throw new AuthError()
      }

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
    } = getWhereQuery(filter, false, requestedFilter)
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
  getUser (
    filter,
    {
      isNotInTrans,
      haveNotSubUsers,
      haveSubUsers,
      isFilledSubUsers,
      sort = ['_id']
    } = {}
  ) {
    return this._getUsers(
      filter,
      {
        isNotInTrans,
        isFoundOne: true,
        haveNotSubUsers,
        haveSubUsers,
        isFilledSubUsers,
        sort
      }
    )
  }

  /**
   * @override
   */
  getUsers (
    filter,
    {
      isNotInTrans,
      haveNotSubUsers,
      haveSubUsers,
      isFilledSubUsers,
      sort = ['_id'],
      limit
    } = {}
  ) {
    return this._getUsers(
      filter,
      {
        isNotInTrans,
        haveNotSubUsers,
        haveSubUsers,
        isFilledSubUsers,
        sort,
        limit
      }
    )
  }

  /**
   * @override
   */
  getElemsInCollBy (
    collName,
    {
      filter = {},
      sort = [],
      subQuery = {
        sort: []
      },
      groupResBy = [],
      isDistinct = false,
      projection = [],
      exclude = [],
      isExcludePrivate = false,
      limit = null
    } = {}
  ) {
    const group = getGroupQuery({ groupResBy })
    const _subQuery = getSubQuery({ name: collName, subQuery })
    const _sort = getOrderQuery(sort)
    const {
      where,
      values
    } = getWhereQuery(filter)
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

    const sql = `SELECT ${distinct}${_projection} FROM ${_subQuery}
      ${where}
      ${group}
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
      const { _id } = { ...auth }

      if (!Number.isInteger(_id)) {
        throw new AuthError()
      }

      data.user_id = _id
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
  async updateRecordOf (name, data) {
    await this._beginTrans(async () => {
      const elems = await this.getElemsInCollBy(name)
      const record = Object.entries(data)
        .reduce((accum, [key, val]) => {
          return {
            ...accum,
            [key]: serializeVal(val)
          }
        }, {})

      if (!Array.isArray(elems)) {
        throw new UpdateRecordError()
      }
      if (elems.length > 1) {
        await this.removeElemsFromDb(name, null, {
          _id: elems.filter((item, i) => i !== 0)
        })
      }
      if (elems.length === 0) {
        await this.insertElemToDb(
          name,
          record
        )

        return
      }

      const { _id } = { ...elems[0] }
      const res = await this.updateCollBy(
        name,
        { _id },
        record
      )

      if (res && res.changes < 1) {
        throw new UpdateRecordError()
      }
    })
  }
}

decorate(injectable(), SqliteDAO)
decorate(inject(TYPES.DB), SqliteDAO, 0)
decorate(inject(TYPES.TABLES_NAMES), SqliteDAO, 1)
decorate(inject(TYPES.SyncSchema), SqliteDAO, 2)
decorate(inject(TYPES.PrepareResponse), SqliteDAO, 3)
decorate(inject(TYPES.DbMigratorFactory), SqliteDAO, 4)

module.exports = SqliteDAO
