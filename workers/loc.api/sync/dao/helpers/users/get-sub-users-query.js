'use strict'

const getWhereQuery = require('../get-where-query')
const getOrderQuery = require('../get-order-query')
const TABLES_NAMES = require('../../../schema/tables-names')

module.exports = (
  masterUser,
  opts
) => {
  const { sort = ['_id'] } = { ...opts }

  const tableAlias = 'mu'
  const {
    where,
    values
  } = getWhereQuery(
    masterUser,
    { alias: tableAlias }
  )
  const _sort = getOrderQuery(sort)

  const sql = `SELECT su.*, ${tableAlias}._id AS masterUserId
    FROM ${TABLES_NAMES.USERS} AS su
    INNER JOIN ${TABLES_NAMES.SUB_ACCOUNTS} AS sa
      ON su._id = sa.subUserId
    INNER JOIN ${TABLES_NAMES.USERS} AS ${tableAlias}
      ON ${tableAlias}._id = sa.masterUserId
    ${where}
    ${_sort}`

  return { sql, values }
}
