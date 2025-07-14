'use strict'

const { promisify } = require('util')
const setImmediatePromise = promisify(setImmediate)

const deserializeVal = require('../serialization/deserialize-val')

module.exports = async (data, methodColl) => {
  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return data
  }

  const dataStructureConverter = methodColl
    .getModelField('DATA_STRUCTURE_CONVERTER')
  const isConvAvailable = typeof dataStructureConverter === 'function'

  let accum = []

  for (const [i, obj] of data.entries()) {
    // Prevent blocking of the event loop when deserializing
    // an array of records longer than 1000 elements
    if ((i % 1000) === 0) {
      await setImmediatePromise()
    }
    if (
      !obj ||
      typeof obj !== 'object'
    ) {
      continue
    }
    if (isConvAvailable) {
      accum = dataStructureConverter(accum, obj)
    }

    const converted = isConvAvailable
      ? accum[accum.length - 1]
      : obj

    Object.keys(converted).forEach((key) => {
      converted[key] = deserializeVal(converted[key], key)
    })
  }

  return isConvAvailable ? accum : data
}
