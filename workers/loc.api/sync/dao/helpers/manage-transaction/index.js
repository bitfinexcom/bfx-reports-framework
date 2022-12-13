'use strict'

const _transactionPromisesSet = new Set()

module.exports = async (
  proccesTransFn,
  ...args
) => {
  const transactionPromises = [..._transactionPromisesSet]

  const newTransQueryPromise = (async () => {
    await Promise.allSettled(transactionPromises)

    return await proccesTransFn(...args)
  })()

  _transactionPromisesSet.add(newTransQueryPromise)

  try {
    const res = await newTransQueryPromise
    _transactionPromisesSet.delete(newTransQueryPromise)

    return res
  } catch (err) {
    _transactionPromisesSet.delete(newTransQueryPromise)

    throw err
  }
}
