'use strict'

module.exports = (err) => {
  return err.toString().includes('database is locked')
}
