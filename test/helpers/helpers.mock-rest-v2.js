'use strict'

const {
  createMockRESTv2SrvWithDate: _createMockRESTv2SrvWithDate,
  getMockDataOpts,
  getMockData,
  setDataTo
} = require('bfx-report/test/helpers/helpers.mock-rest-v2')

const _mockData = require('./mock-data')

const _getMockData = (methodName) => {
  return getMockData(methodName, _mockData)
}

const _setDataTo = (
  key,
  dataItem,
  {
    date = Date.now(),
    id = 12345,
    fee = 0.1
  } = {}
) => {
  const _dataItem = setDataTo(
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
  }
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
  getMockData: _getMockData
}
