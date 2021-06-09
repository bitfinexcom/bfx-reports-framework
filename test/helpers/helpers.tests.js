'use strict'

const { assert } = require('chai')

const testCsvPathHasCommonFolder = ({ aggrRes }) => {
  aggrRes.newFilePaths.forEach((newFilePath) => {
    // example: reports/csv/user_full-tax-report_FROM_Fri-Dec-01-2017_TO_Fri-May-28-2021/user_full-tax-report_END_SNAPSHOT_Tue-Jun-08-2021.csv
    assert.match(
      newFilePath,
      /csv\/[A-Za-z0-9\-_]+\/[A-Za-z0-9\-_]+\.csv$/,
      'Has csv common folder for group reports'
    )
  })
}

module.exports = {
  testCsvPathHasCommonFolder
}
