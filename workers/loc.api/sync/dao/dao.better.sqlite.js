'use strict'

const { promisify } = require('util')
const setImmediatePromise = promisify(setImmediate)
const MAIN_DB_WORKER_ACTIONS = require(
  'bfx-facs-db-better-sqlite/worker/db-worker-actions/db-worker-actions.const'
)
const {
  checkFilterParams,
  normalizeFilterParams
} = require('bfx-report/workers/loc.api/helpers')
const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const DAO = require('./dao')
const {
  mixUserIdToArrData,
  serializeObj,
  filterModelNameMap,
  mapObjBySchema,
  getIndexCreationQuery,
  getTableCreationQuery,
  getTriggerCreationQuery,
  getTablesNamesQuery,
  getProjectionQuery,
  getPlaceholdersQuery,
  getOrderQuery,
  getWhereQuery,
  getGroupQuery,
  getSubQuery,
  getLimitQuery,
  manageTransaction
} = require('./helpers')

const {
  DbVersionTypeError,
  SqlCorrectnessError,
  RemoveListElemsError,
  UpdateRecordError
} = require('../../errors')

const {
  TRIGGER_FIELD_NAME,
  INDEX_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME
} = require('../schema/const')
const DB_WORKER_ACTIONS = require(
  './sqlite-worker/db-worker-actions/db-worker-actions.const'
)
const dbWorkerActions = require(
  './sqlite-worker/db-worker-actions'
)
const {
  getArgs,
  getQuery,
  convertData,
  prepareDbResponse
} = require('./helpers/find-in-coll-by')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DB,
  TYPES.TABLES_NAMES,
  TYPES.SyncSchema,
  TYPES.DbMigratorFactory
]
class BetterSqliteDAO extends DAO {
  constructor (...args) {
    super(...args)

    this.asyncQuery = this.db.asyncQuery.bind(this.db)
    this._initializeWalCheckpointRestart = this.db
      .initializeWalCheckpointRestart.bind(this.db)
    this.db = this.db.db
  }

  query (args, opts) {
    const { withoutWorkerThreads } = { ...opts }

    if (withoutWorkerThreads) {
      return dbWorkerActions(this.db, args)
    }

    return this.asyncQuery(args)
  }

  async _proccesTrans (
    asyncExecQuery,
    opts = {}
  ) {
    const {
      beforeTransFn,
      afterTransFn
    } = { ...opts }

    let isTransBegun = false

    try {
      if (typeof beforeTransFn === 'function') {
        await beforeTransFn()
      }

      this.db.prepare('BEGIN TRANSACTION').run()
      isTransBegun = true

      const res = await asyncExecQuery()

      this.db.prepare('COMMIT').run()

      if (typeof afterTransFn === 'function') {
        await afterTransFn()
      }

      return res
    } catch (err) {
      if (isTransBegun) {
        this.db.prepare('ROLLBACK').run()
      }
      if (typeof afterTransFn === 'function') {
        await afterTransFn()
      }

      throw err
    }
  }

  async _beginTrans (
    asyncExecQuery,
    opts = {}
  ) {
    return manageTransaction(
      () => this._proccesTrans(asyncExecQuery, opts)
    )
  }

  _createTablesIfNotExists () {
    const models = this._getModelsMap({
      omittedFields: [
        TRIGGER_FIELD_NAME,
        INDEX_FIELD_NAME,
        UNIQUE_INDEX_FIELD_NAME
      ]
    })
    const sql = getTableCreationQuery(models, true)

    return this.query({
      action: DB_WORKER_ACTIONS.RUN_IN_TRANS,
      sql,
      params: { transVersion: 'exclusive' }
    })
  }

  _createTriggerIfNotExists () {
    const models = this._getModelsMap({ omittedFields: [] })
    const sql = getTriggerCreationQuery(models, true)

    return this.query({
      action: DB_WORKER_ACTIONS.RUN_IN_TRANS,
      sql,
      params: { transVersion: 'exclusive' }
    })
  }

  _createIndexisIfNotExists () {
    const models = this._getModelsMap({ omittedFields: [] })
    const sql = getIndexCreationQuery(models)

    return this.query({
      action: DB_WORKER_ACTIONS.RUN_IN_TRANS,
      sql,
      params: { transVersion: 'exclusive' }
    })
  }

  async _getTablesNames () {
    const sql = getTablesNamesQuery()
    const data = await this.query({
      action: MAIN_DB_WORKER_ACTIONS.ALL,
      sql
    })

    if (!Array.isArray(data)) {
      return []
    }

    return data.map(({ name }) => name)
  }

  async _enableWALJournalMode () {
    await this.query({
      action: MAIN_DB_WORKER_ACTIONS.EXEC_PRAGMA,
      sql: 'synchronous = NORMAL'
    })
    await this.query({
      action: MAIN_DB_WORKER_ACTIONS.EXEC_PRAGMA,
      sql: 'journal_mode = WAL'
    })

    this._initializeWalCheckpointRestart()
  }

  _setCacheSize (size = 10000) {
    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.EXEC_PRAGMA,
      sql: `cache_size = ${size}`
    })
  }

  _setAnalysisLimit (limit = 1000) {
    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.EXEC_PRAGMA,
      sql: `analysis_limit = ${limit}`
    })
  }

  _vacuum () {
    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.RUN,
      sql: 'VACUUM'
    })
  }

  optimize () {
    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.EXEC_PRAGMA,
      sql: 'optimize'
    })
  }

  enableForeignKeys () {
    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.EXEC_PRAGMA,
      sql: 'foreign_keys = ON'
    })
  }

  disableForeignKeys () {
    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.EXEC_PRAGMA,
      sql: 'foreign_keys = OFF'
    })
  }

  async dropAllTables () {
    const tableNames = await this._getTablesNames()
    const sql = tableNames.map((name) => (
      `DROP TABLE IF EXISTS ${name}`
    ))

    return this.query({
      action: DB_WORKER_ACTIONS.RUN_IN_TRANS,
      sql,
      params: { transVersion: 'exclusive' }
    })
  }

  /**
   * @override
   */
  async beforeMigrationHook () {
    await this.enableForeignKeys()
    await this._enableWALJournalMode()
    await this._setCacheSize()
    await this._setAnalysisLimit()
  }

  /**
   * @override
   */
  async databaseInitialize (db) {
    await super.databaseInitialize(db)

    await this._createTablesIfNotExists()
    await this._createIndexisIfNotExists()
    await this._createTriggerIfNotExists()
    await this._vacuum()
    await this.setCurrDbVer(this.syncSchema.SUPPORTED_DB_VERSION)
  }

  /**
   * @override
   */
  async isDBEmpty () {
    const tableNames = await this._getTablesNames()

    return (
      !Array.isArray(tableNames) ||
      tableNames.length === 0
    )
  }

  /**
   * @override
   */
  getCurrDbVer () {
    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.EXEC_PRAGMA,
      sql: 'user_version'
    })
  }

  /**
   * @override
   */
  setCurrDbVer (version) {
    if (!Number.isInteger(version)) {
      throw new DbVersionTypeError()
    }

    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.EXEC_PRAGMA,
      sql: `user_version = ${version}`
    })
  }

  /**
   * @override
   */
  async executeQueriesInTrans (
    sql,
    opts = {}
  ) {
    const {
      beforeTransFn,
      afterTransFn,
      withoutWorkerThreads
    } = { ...opts }
    const isArray = Array.isArray(sql)
    const sqlArr = isArray ? sql : [sql]

    if (sqlArr.length === 0) {
      return
    }
    if (withoutWorkerThreads) {
      return this._beginTrans(async () => {
        const res = []

        for (const sqlData of sqlArr) {
          const _sql = typeof sqlData === 'string'
            ? sqlData
            : null
          const _execQueryFn = typeof sqlData === 'function'
            ? sqlData
            : null
          const _sqlData = typeof sqlData === 'object'
            ? sqlData
            : { sql: _sql, execQueryFn: _execQueryFn }
          const { sql, values, execQueryFn } = { ..._sqlData }
          const hasSql = sql && typeof sql === 'string'
          const hasExecQueryFn = typeof execQueryFn === 'function'

          if (!hasSql && !hasExecQueryFn) {
            throw new SqlCorrectnessError()
          }
          if (hasSql) {
            res.push(await this.query({
              action: MAIN_DB_WORKER_ACTIONS.RUN,
              sql,
              params: values
            }, { withoutWorkerThreads }))
          }
          if (hasExecQueryFn) {
            res.push(await execQueryFn())
          }
        }

        return isArray ? res : res[0]
      }, { beforeTransFn, afterTransFn })
    }

    const {
      query,
      params
    } = sqlArr.reduce((accum, curr) => {
      if (
        curr &&
        typeof curr === 'string'
      ) {
        accum.query.push(curr)
        accum.params.push()

        return accum
      }
      if (
        curr &&
        typeof curr === 'object'
      ) {
        const { sql, values } = curr

        accum.query.push(sql)
        accum.params.push(values)

        return accum
      }

      throw new SqlCorrectnessError()
    }, { query: [], params: [] })

    let res

    try {
      if (typeof beforeTransFn === 'function') {
        await beforeTransFn()
      }

      res = await this.query({
        action: DB_WORKER_ACTIONS.RUN_IN_TRANS,
        sql: isArray ? query : query[0],
        params: isArray ? params : params[0]
      })

      if (typeof afterTransFn === 'function') {
        await afterTransFn()
      }
    } catch (err) {
      if (typeof afterTransFn === 'function') {
        await afterTransFn()
      }

      throw err
    }

    return res
  }

  /**
   * @override
   */
  async insertElemToDb (
    name,
    obj = {},
    opts = {}
  ) {
    const {
      isReplacedIfExists,
      withoutWorkerThreads
    } = { ...opts }

    const keys = Object.keys(obj)
    const projection = getProjectionQuery(keys)
    const {
      placeholders,
      placeholderVal: params
    } = getPlaceholdersQuery(obj, keys)
    const replace = isReplacedIfExists
      ? ' OR REPLACE'
      : ''

    const sql = `INSERT${replace} 
      INTO ${name}(${projection})
      VALUES (${placeholders})`

    await this.query({
      action: MAIN_DB_WORKER_ACTIONS.RUN,
      sql,
      params
    }, { withoutWorkerThreads })
  }

  /**
   * To prevent blocking the Event Loop applies setImmediate
   * and handles a transaction manually
   * @override
   */
  async insertElemsToDb (
    name,
    auth,
    data = [],
    opts = {}
  ) {
    const {
      isReplacedIfExists
    } = { ...opts }

    const sql = []
    const params = []

    for (const obj of data) {
      await setImmediatePromise()

      const _obj = mixUserIdToArrData(
        auth,
        obj
      )
      const keys = Object.keys(_obj)

      if (keys.length === 0) {
        continue
      }

      const projection = getProjectionQuery(keys)
      const {
        placeholders,
        placeholderVal
      } = getPlaceholdersQuery(_obj, keys)
      const replace = isReplacedIfExists
        ? ' OR REPLACE'
        : ''

      sql.push(
        `INSERT${replace}
          INTO ${name}(${projection})
          VALUES (${placeholders})`
      )
      params.push(placeholderVal)
    }

    if (sql.length === 0) {
      return
    }

    await this._beginTrans(async () => {
      for (const [i, param] of params.entries()) {
        await setImmediatePromise()

        this.db.prepare(sql[i]).run(param)
      }
    })
  }

  /**
   * To prevent blocking the Event Loop applies setImmediate
   * and handles a transaction manually
   * @override
   */
  async insertElemsToDbIfNotExists (
    name,
    auth,
    data = []
  ) {
    const sql = []
    const params = []

    for (const obj of data) {
      await setImmediatePromise()

      const _obj = mixUserIdToArrData(
        auth,
        obj
      )
      const keys = Object.keys(_obj)

      if (keys.length === 0) {
        continue
      }

      const item = serializeObj(_obj, keys)
      const projection = getProjectionQuery(keys)
      const {
        where,
        values
      } = getWhereQuery(item)
      const {
        placeholders,
        placeholderVal
      } = getPlaceholdersQuery(item, keys)

      sql.push(
        `INSERT INTO ${name}(${projection}) SELECT ${placeholders}
          WHERE NOT EXISTS(SELECT 1 FROM ${name} ${where})`
      )
      params.push({ ...values, ...placeholderVal })
    }

    if (sql.length === 0) {
      return
    }

    await this._beginTrans(async () => {
      for (const [i, param] of params.entries()) {
        await setImmediatePromise()

        this.db.prepare(sql[i]).run(param)
      }
    })
  }

  /**
   * @override
   */
  async findInCollBy (
    method,
    reqArgs,
    opts
  ) {
    const {
      schema = {},
      isNotDataConverted = false
    } = { ...opts }
    const filterModelName = filterModelNameMap.get(method)
    const methodColl = {
      ...this._getMethodCollMap().get(method),
      ...schema
    }

    const args = normalizeFilterParams(method, reqArgs)
    checkFilterParams(filterModelName, args)
    const _args = getArgs(args, methodColl)

    const { sql, sqlParams } = getQuery(
      _args,
      methodColl,
      opts
    )

    const _res = await this.query({
      action: MAIN_DB_WORKER_ACTIONS.ALL,
      sql,
      params: sqlParams
    })
    const res = isNotDataConverted
      ? _res
      : await convertData(_res, methodColl)

    return prepareDbResponse(
      res,
      _args,
      methodColl,
      {
        ...opts,
        method,
        findInCollByFn: (...args) => this.findInCollBy(...args)
      }
    )
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
      sort = ['_id'],
      withoutWorkerThreads
    } = {}
  ) {
    return this.query({
      action: DB_WORKER_ACTIONS.GET_USERS,
      params: {
        filter,
        opts: {
          isNotInTrans,
          isFoundOne: true,
          haveNotSubUsers,
          haveSubUsers,
          isFilledSubUsers,
          sort
        }
      }
    }, { withoutWorkerThreads })
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
    return this.query({
      action: DB_WORKER_ACTIONS.GET_USERS,
      params: {
        filter,
        opts: {
          isNotInTrans,
          haveNotSubUsers,
          haveSubUsers,
          isFilledSubUsers,
          sort,
          limit
        }
      }
    })
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

    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.ALL,
      sql,
      params: { ...values, ...limitVal }
    })
  }

  /**
   * @override
   */
  getElemInCollBy (
    name,
    filter = {},
    sort = []
  ) {
    const _sort = getOrderQuery(sort)
    const {
      where,
      values: params
    } = getWhereQuery(filter)

    const sql = `SELECT * FROM ${name}
      ${where}
      ${_sort}`

    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.GET,
      sql,
      params
    })
  }

  /**
   * @override
   */
  async updateCollBy (
    name,
    filter = {},
    data = {},
    opts
  ) {
    const {
      withoutWorkerThreads
    } = { ...opts }
    const {
      where,
      values: params
    } = getWhereQuery(filter)
    const fields = Object.keys(data).map((item) => {
      const key = `new_${item}`
      params[key] = data[item]

      return `${item} = $${key}`
    }).join(', ')

    const sql = `UPDATE ${name} SET ${fields} ${where}`

    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.RUN,
      sql,
      params
    }, { withoutWorkerThreads })
  }

  /**
   * To prevent blocking the Event Loop applies setImmediate
   * and handles a transaction manually
   * @override
   */
  async updateElemsInCollBy (
    name,
    data = [],
    filterPropNames = {},
    upPropNames = {}
  ) {
    const sql = []
    const params = []

    for (const obj of data) {
      await setImmediatePromise()

      const filter = mapObjBySchema(obj, filterPropNames)
      const newItem = mapObjBySchema(obj, upPropNames)
      const {
        where,
        values
      } = getWhereQuery(filter)
      const fields = Object.keys(newItem).map((item) => {
        const key = `new_${item}`
        values[key] = newItem[item]

        return `${item} = $${key}`
      }).join(', ')

      sql.push(`UPDATE ${name} SET ${fields} ${where}`)
      params.push(values)
    }

    if (sql.length === 0) {
      return
    }

    await this._beginTrans(async () => {
      for (const [i, param] of params.entries()) {
        await setImmediatePromise()

        this.db.prepare(sql[i]).run(param)
      }
    })
  }

  /**
   * @override
   */
  async updateRecordOf (name, record) {
    const data = serializeObj(record)

    const res = await this.query({
      action: DB_WORKER_ACTIONS.UPDATE_RECORD_OF,
      params: { data, name }
    })
    const { changes } = { ...res }

    if (changes < 1) {
      throw new UpdateRecordError()
    }
  }

  /**
   * @override
   */
  async removeElemsFromDb (
    name,
    auth,
    data = {},
    opts
  ) {
    if (auth) {
      const { _id } = { ...auth }

      if (!Number.isInteger(_id)) {
        throw new AuthError()
      }

      data.user_id = _id
    }

    const {
      withoutWorkerThreads
    } = { ...opts }
    const {
      where,
      values: params
    } = getWhereQuery(data)

    const sql = `DELETE FROM ${name} ${where}`

    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.RUN,
      sql,
      params
    }, { withoutWorkerThreads })
  }

  /**
   * @override
   */
  async removeElemsFromDbIfNotInLists (name, lists) {
    const areAllListsNotArr = Object.keys(lists)
      .every(key => !Array.isArray(lists[key]))

    if (areAllListsNotArr) {
      throw new RemoveListElemsError()
    }

    const $or = Object.entries(lists)
      .reduce((accum, [key, val]) => {
        return {
          $not: {
            ...accum.$not,
            [key]: val
          }
        }
      }, { $not: {} })
    const {
      where,
      values: params
    } = getWhereQuery({ $or })

    const sql = `DELETE FROM ${name} ${where}`

    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.RUN,
      sql,
      params
    })
  }
}

decorateInjectable(BetterSqliteDAO, depsTypes)

module.exports = BetterSqliteDAO
