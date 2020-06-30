'use strict'

module.exports = (
  dateFieldName,
  elDb,
  elApi
) => {
  const _elDb = Array.isArray(elDb) ? elDb[0] : elDb
  const _elApi = Array.isArray(elApi) ? elApi[0] : elApi

  return (_elDb[dateFieldName] < _elApi[dateFieldName])
    ? _elDb[dateFieldName]
    : false
}
