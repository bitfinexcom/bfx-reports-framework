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
  UpdateRecordError,
  RemoveElemsLeaveLastNRecordsError
} = require('../../errors')

const {
  CONSTR_FIELD_NAME,
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
  TYPES.DbMigratorFactory,
  TYPES.ProcessMessageManagerFactory
]
class BetterSqliteDAO extends DAO {
  constructor (...args) {
    super(...args)

    const dbFac = this.db
    this.getConnection = () => dbFac.db
    this.db = this.getConnection()

    this.startDb = promisify(dbFac.start).bind(dbFac)
    this.stopDb = promisify(dbFac.stop).bind(dbFac)

    this.asyncQuery = dbFac.asyncQuery.bind(dbFac)
    this._initializeWalCheckpointRestart = dbFac
      .initializeWalCheckpointRestart.bind(dbFac)
  }

  async restartDb (opts = {}) {
    const { middleware } = opts ?? {}

    await this.stopDb()

    if (typeof middleware === 'function') {
      await middleware()
    }

    await this.startDb()

    this.db = this.getConnection()

    await this.beforeMigrationHook()
    await this._walCheckpoint()
    await this._vacuum()
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
    const { isNotInTrans } = opts ?? {}

    if (isNotInTrans) {
      return await asyncExecQuery()
    }

    return await manageTransaction(
      () => this._proccesTrans(asyncExecQuery, opts)
    )
  }

  _createTablesIfNotExists (opts = {}) {
    const models = this._getModelsMap({
      models: opts?.models,
      omittedFields: [
        TRIGGER_FIELD_NAME,
        INDEX_FIELD_NAME,
        UNIQUE_INDEX_FIELD_NAME
      ]
    })
    const sql = getTableCreationQuery(models, opts)

    return this.query({
      action: DB_WORKER_ACTIONS.RUN_IN_TRANS,
      sql,
      params: { transVersion: 'exclusive' }
    }, { withoutWorkerThreads: true })
  }

  _createTriggerIfNotExists (opts = {}) {
    const models = this._getModelsMap({
      models: opts?.models,
      omittedFields: []
    })
    const sql = getTriggerCreationQuery(models, opts)

    return this.query({
      action: DB_WORKER_ACTIONS.RUN_IN_TRANS,
      sql,
      params: { transVersion: 'exclusive' }
    }, { withoutWorkerThreads: true })
  }

  _createIndexisIfNotExists (opts = {}) {
    const models = this._getModelsMap({
      models: opts?.models,
      omittedFields: []
    })
    const sql = getIndexCreationQuery(models, opts)

    return this.query({
      action: DB_WORKER_ACTIONS.RUN_IN_TRANS,
      sql,
      params: { transVersion: 'exclusive' }
    }, { withoutWorkerThreads: true })
  }

  async getTablesNames () {
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

  _tryToExecuteRollback () {
    try {
      this.db.prepare('ROLLBACK').run()
    } catch (err) {}
  }

  _vacuum () {
    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.RUN,
      sql: 'VACUUM'
    })
  }

  _walCheckpoint () {
    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.EXEC_PRAGMA,
      sql: 'wal_checkpoint(RESTART)'
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
    }, { withoutWorkerThreads: true })
  }

  disableForeignKeys () {
    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.EXEC_PRAGMA,
      sql: 'foreign_keys = OFF'
    }, { withoutWorkerThreads: true })
  }

  async hasTable (name) {
    const names = Array.isArray(name)
      ? name
      : [name]

    const tableNames = await this.getTablesNames()

    return names.every((name) => (
      tableNames.some((tName) => name === tName)
    ))
  }

  async getFilteredTablesNames (opts) {
    const {
      exceptions = [],
      expectations = [],
      isNotStrictEqual = false
    } = opts ?? {}

    const _exceptions = Array.isArray(exceptions)
      ? exceptions
      : []
    const _expectations = Array.isArray(expectations)
      ? expectations
      : []
    const tableNames = await this.getTablesNames()
    const filteredTableNames = tableNames.filter((name) => (
      _exceptions.every((exc) => (
        name !== exc &&
        (!isNotStrictEqual || !name.includes(exc)))
      ) &&
      (
        _expectations.length === 0 ||
        _expectations.some((exp) => (
          name === exp ||
          (isNotStrictEqual && name.includes(exp)))
        )
      )
    ))

    return filteredTableNames
  }

  async dropAllTables (opts = {}) {
    const { isNotInTrans } = opts ?? {}
    const filteredTableNames = await this.getFilteredTablesNames(opts)

    const sqlArr = filteredTableNames.map((name) => (
      `DROP TABLE IF EXISTS ${name}`
    ))

    if (isNotInTrans) {
      const res = []

      for (const sql of sqlArr) {
        const oneRes = this.db.prepare(sql).run()

        res.push(oneRes)
      }

      return res
    }

    const res = await this.query({
      action: DB_WORKER_ACTIONS.RUN_IN_TRANS,
      sql: sqlArr,
      params: { transVersion: 'exclusive' }
    }, { withoutWorkerThreads: true })

    await this._walCheckpoint()
    await this._vacuum()

    return res
  }

  /**
   * @override
   */
  async moveTempTableDataToMain (opts = {}) {
    const {
      namePrefix,
      isNotInTrans,
      isStrictEqual
    } = opts ?? {}

    if (
      !namePrefix ||
      typeof namePrefix !== 'string'
    ) {
      return false
    }

    const modelsMap = this._getModelsMap({
      omittedFields: [
        '_id',
        CONSTR_FIELD_NAME,
        TRIGGER_FIELD_NAME,
        INDEX_FIELD_NAME,
        UNIQUE_INDEX_FIELD_NAME
      ]
    })

    await this._beginTrans(async () => {
      const tableNames = await this.getTablesNames()
      const filteredTempTableNames = tableNames.filter((name) => (
        name.includes(namePrefix)
      ))

      const sqlArr = []

      for (const tempName of filteredTempTableNames) {
        const name = tempName.replace(namePrefix, '')
        const model = modelsMap.get(name)
        const projection = Object.keys(model).join(', ')

        if (!model) {
          continue
        }
        if (isStrictEqual) {
          sqlArr.push(`DELETE FROM ${name}`)
        }

        sqlArr.push(`INSERT OR REPLACE
          INTO ${name}(${projection})
          SELECT ${projection} FROM ${tempName}`)
      }

      for (const sql of sqlArr) {
        this.db.prepare(sql).run()
      }
    }, { isNotInTrans })

    return true
  }

  /**
   * @override
   */
  async beforeMigrationHook () {
    await this.enableForeignKeys()
    await this._enableWALJournalMode()
    await this._setCacheSize()
    await this._setAnalysisLimit()

    // In case if the app is closed with non-finished transaction
    // try to execute `ROLLBACK` sql query to avoid locking the DB
    this._tryToExecuteRollback()
  }

  /**
   * @override
   */
  async createDBStructure (opts = {}) {
    await this._createTablesIfNotExists(opts)
    await this._createIndexisIfNotExists(opts)
    await this._createTriggerIfNotExists(opts)
  }

  /**
   * @override
   */
  async databaseInitialize (db) {
    await super.databaseInitialize(db)

    await this._walCheckpoint()
    await this._vacuum()
    await this.setCurrDbVer(this.syncSchema.SUPPORTED_DB_VERSION)
  }

  /**
   * @override
   */
  async isDBEmpty () {
    const tableNames = await this.getTablesNames()

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
  backupDb (params = {}) {
    const {
      filePath = `backup-${new Date().toISOString()}.db`,
      progressFn,
      isPaused = false
    } = params ?? {}
    return this.db.backup(filePath, {
      progress ({ totalPages: t, remainingPages: r }) {
        if (typeof progressFn === 'function') {
          const progress = Math.round((t - r) / t * 100)

          progressFn(progress)
        }

        /*
         * If return 0 backup will be paused
         * https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#backupdestination-options---promise
         */
        return isPaused ? 0 : 100
      }
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
      withoutWorkerThreads = true
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

    return await this.query({
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
      isReplacedIfExists,
      isStrictEqual
    } = opts ?? {}

    const queries = []

    if (isStrictEqual) {
      queries.push({ sql: `DELETE FROM ${name}` })
    }

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

      queries.push({
        sql: `INSERT${replace}
          INTO ${name}(${projection})
          VALUES (${placeholders})`,
        param: placeholderVal
      })
    }

    if (queries.length === 0) {
      return
    }

    await this._beginTrans(async () => {
      for (const { sql, param } of queries) {
        await setImmediatePromise()

        const stm = this.db.prepare(sql)

        if (typeof param === 'undefined') {
          stm.run()

          continue
        }

        stm.run(param)
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
      groupFns = [],
      groupResBy = [],
      isDistinct = false,
      projection = [],
      exclude = [],
      isExcludePrivate = false,
      limit = null
    } = {}
  ) {
    const {
      group,
      groupProj
    } = getGroupQuery({ groupFns, groupResBy })
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
    const delimiter = (
      groupProj.length > 0 &&
      _projection.length > 0
    )
      ? ', '
      : ''

    const sql = `SELECT ${distinct}${groupProj}${delimiter}${_projection} FROM ${_subQuery}
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
      withoutWorkerThreads = true
    } = opts ?? {}
    const {
      where,
      values: params
    } = getWhereQuery(filter)

    const dataKeys = Object.keys(data)
    const serializedData = serializeObj(data, dataKeys)
    const fields = dataKeys.map((item) => {
      const key = `new_${item}`
      params[key] = serializedData[item]

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
  async updateRecordOf (name, record, opts) {
    const {
      shouldNotThrowError = false
    } = opts ?? {}
    const data = serializeObj(record)

    const res = await this.query({
      action: DB_WORKER_ACTIONS.UPDATE_RECORD_OF,
      params: { data, name }
    }, { withoutWorkerThreads: true })

    if (shouldNotThrowError) {
      return res
    }
    if (res?.changes < 1) {
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
      withoutWorkerThreads = true
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
  async removeElemsLeaveLastNRecords (name, params = {}) {
    const {
      filter,
      limit,
      sort
    } = params ?? {}

    if (
      !Number.isInteger(limit) ||
      limit < 0
    ) {
      throw new RemoveElemsLeaveLastNRecordsError()
    }

    const {
      where,
      values
    } = getWhereQuery(
      filter,
      { isNotSetWhereClause: true }
    )
    const _sort = getOrderQuery(sort)
    const {
      limit: _limit,
      limitVal
    } = getLimitQuery({ limit })
    const limitRestrictionQuery = `WHERE _id NOT IN
      (SELECT _id FROM ${name} WHERE ${where} ${_sort} ${_limit})`
    const _where = [
      limitRestrictionQuery,
      where
    ].filter((query) => query).join(' AND ')

    const sql = `DELETE FROM ${name} ${_where}`

    return this.query({
      action: MAIN_DB_WORKER_ACTIONS.RUN,
      sql,
      params: { ...values, ...limitVal }
    }, { withoutWorkerThreads: true })
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
    }, { withoutWorkerThreads: true })
  }
}

decorateInjectable(BetterSqliteDAO, depsTypes)

module.exports = BetterSqliteDAO
