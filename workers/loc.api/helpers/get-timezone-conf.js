'use strict'

const moment = require('moment-timezone')

const _getTimezoneName = (name) => {
  let _name = name || 'UTC'
  const aliases = [
    ['Kiev', ['Kyiv']]
  ]

  aliases.some(item => {
    if (item[1].some(alias => alias === name)) {
      _name = item[0]

      return true
    }
  })

  const arr = _name.split(/[_-\s,./\\|]/g)
  const regExp = new RegExp(`${arr.join('.*')}`, 'gi')
  const zoneNames = moment.tz.names()

  for (const zone of zoneNames) {
    if (regExp.test(zone)) {
      return zone
    }
  }

  return 'UTC'
}

const _getTimezoneOffset = (timezoneName) => {
  const strTimezoneOffset = moment.tz(timezoneName).format('Z')
  const timezoneOffset = parseFloat(strTimezoneOffset)

  return isFinite(timezoneOffset)
    ? timezoneOffset
    : strTimezoneOffset
}

module.exports = (name) => {
  const timezoneName = _getTimezoneName(name)
  const timezoneOffset = _getTimezoneOffset(timezoneName)

  return timezoneName
    ? {
      timezoneName,
      timezoneOffset
    }
    : {
      timezoneName: 'UTC',
      timezoneOffset: 0
    }
}
