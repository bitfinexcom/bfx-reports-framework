'use strict'

module.exports = async (dao, isDroppedIfExists) => {
  const tablesNames = await dao.getTablesNames()
  const sqlArr = tablesNames.map((name) => {
    return () => dao.dropTable(name, isDroppedIfExists)
  })

  return sqlArr
}
