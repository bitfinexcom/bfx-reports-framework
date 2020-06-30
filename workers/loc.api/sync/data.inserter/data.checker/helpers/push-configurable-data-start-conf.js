'use strict'

module.exports = (
  schema,
  symbol,
  startConf = {},
  timeframe
) => {
  const {
    baseStartFrom,
    baseStartTo,
    currStart
  } = { ...startConf }

  const currStartConfArr = schema.start
    .find(([symb, conf, tFrame]) => (
      symb === symbol &&
      (
        !timeframe ||
        tFrame === timeframe
      )
    ))

  if (!Array.isArray(currStartConfArr)) {
    schema.start.push([
      symbol,
      {
        baseStartFrom,
        baseStartTo,
        currStart
      },
      timeframe
    ])

    return
  }

  const currStartConf = { ...currStartConfArr[1] }
  const _startConf = {
    baseStartFrom: (
      Number.isInteger(currStartConf.baseStartFrom) &&
      (
        !Number.isInteger(baseStartFrom) ||
        currStartConf.baseStartFrom < baseStartFrom
      )
    )
      ? currStartConf.baseStartFrom
      : baseStartFrom,
    baseStartTo: (
      Number.isInteger(currStartConf.baseStartTo) &&
      (
        !Number.isInteger(baseStartTo) ||
        currStartConf.baseStartTo > baseStartTo
      )
    )
      ? currStartConf.baseStartTo
      : baseStartTo,
    currStart: (
      Number.isInteger(currStartConf.currStart) &&
      (
        !Number.isInteger(currStart) ||
        currStartConf.currStart < currStart
      )
    )
      ? currStartConf.currStart
      : currStart
  }

  currStartConfArr[1] = {
    ...currStartConf,
    ..._startConf
  }
}
