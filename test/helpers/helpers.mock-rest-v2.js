'use strict'

const {
  createMockRESTv2SrvWithDate: _createMockRESTv2SrvWithDate,
  getMockDataOpts,
  getMockData: _getMockData,
  setDataTo: _setDataTo
} = require('bfx-report/test/helpers/helpers.mock-rest-v2')

const _mockData = require('./mock-data')

const getMockData = (methodName) => {
  return _getMockData(methodName, _mockData)
}

const setDataTo = (
  key,
  dataItem,
  {
    date = Date.now(),
    id = 12345,
    fee = 0.0001
  } = {}
) => {
  const _dataItem = _setDataTo(
    key,
    dataItem,
    {
      date,
      id,
      fee
    }
  )
  const _date = Math.round(date)

  if (key === 'candles') {
    _dataItem[0] = _date
  }

  return dataItem
}

const createMockRESTv2SrvWithDate = (
  start = Date.now(),
  end = start,
  limit = null,
  opts = {
    ...getMockDataOpts(),
    candles: { limit: 500 }
  },
  {
    _getMockData = getMockData,
    _setDataTo = setDataTo
  } = {}
) => {
  return _createMockRESTv2SrvWithDate(
    start,
    end,
    limit,
    opts,
    {
      _getMockData,
      _setDataTo
    }
  )
}

module.exports = {
  createMockRESTv2SrvWithDate,
  getMockData,
  setDataTo
}
