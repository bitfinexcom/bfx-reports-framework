'use strict'

const getProjectionQuery = require(
  '../../helpers/get-projection-query'
)
const getPlaceholdersQuery = require(
  '../../helpers/get-placeholders-query'
)

const _runStm = (stm, param) => {
  return typeof param === 'undefined'
    ? stm.run()
    : stm.run(param)
}

module.exports = (db, sql, params) => {
  const { name } = { ...params }

  const getElemsStm = db.prepare(`SELECT * FROM ${name}`)

  const trx = db.transaction((params) => {
    const { data, name } = { ...params }
    const elems = getElemsStm.all()

    if (
      !Array.isArray(elems) ||
      elems.length === 0
    ) {
      const keys = Object.keys(data)
      const projection = getProjectionQuery(keys)
      const {
        placeholders,
        placeholderVal
      } = getPlaceholdersQuery(data, keys)

      const insertStm = db.prepare(
        `INSERT INTO ${name}(${projection})
          VALUES (${placeholders})`
      )

      return _runStm(insertStm, placeholderVal)
    }
    if (elems.length > 1) {
      const removeStm = db.prepare(
        `DELETE FROM ${name} WHERE _id != $_id`
      )

      _runStm(removeStm, { _id: elems[0]._id })
    }

    const { _id } = { ...elems[0] }
    const values = { _id }
    const fields = Object.keys(data)
      .map((item) => {
        const key = `new_${item}`
        values[key] = data[item]

        return `${item} = $${key}`
      })
      .join(', ')
    const updateStm = db.prepare(
      `UPDATE ${name} SET ${fields}
        WHERE _id = $_id`
    )

    return _runStm(updateStm, values)
  })

  return trx(params)
}
