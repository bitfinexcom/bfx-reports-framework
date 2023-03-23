'use strict'

const { v4: uuidv4 } = require('uuid')
const {
  createMockRESTv2SrvWithDate: _createMockRESTv2SrvWithDate,
  getMockDataOpts: getBaseMockDataOpts,
  getMockData: _getMockData,
  setDataTo: _setDataTo
} = require('bfx-report/test/helpers/helpers.mock-rest-v2')

const _mockData = require('./mock-data')

const getMockData = (methodName, mockData = _mockData) => {
  return _getMockData(methodName, mockData)
}

const setDataTo = (
  key,
  dataItem,
  {
    date = Date.now(),
    id = 12345,
    fee = 0.0001,
    strId = uuidv4()
  } = {}
) => {
  const _dataItem = _setDataTo(
    key,
    dataItem,
    {
      date,
      id,
      fee,
      strId
    }
  )
  const _date = Math.round(date)

  if (key === 'candles') {
    _dataItem[0] = _date
  }

  return dataItem
}

const getMockDataOpts = () => ({
  ...getBaseMockDataOpts(),
  candles: { limit: 500 },
  generate_token: null,
  delete_token: null,
  login: null,
  login_verify: null
})

const getExtraMockMethods = () => (new Map([
  ['post', {
    '/v2/login': 'login',
    '/v2/login/verify': 'login_verify'
  }]
]))

const createMockRESTv2SrvWithDate = (
  start = Date.now(),
  end = start,
  limit = null,
  opts = getMockDataOpts(),
  {
    _getMockData = getMockData,
    _setDataTo = setDataTo,
    extraMockMethods = getExtraMockMethods()
  } = {}
) => {
  return _createMockRESTv2SrvWithDate(
    start,
    end,
    limit,
    opts,
    {
      _getMockData,
      _setDataTo,
      extraMockMethods
    }
  )
}

module.exports = {
  createMockRESTv2SrvWithDate,
  getMockData,
  setDataTo
}
