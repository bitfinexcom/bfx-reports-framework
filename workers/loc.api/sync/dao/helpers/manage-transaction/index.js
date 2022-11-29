'use strict'

const _transactionPromisesSet = new Set()

const _manageTrans = async (proccesTransFn, ...args) => {
  await Promise.allSettled(_transactionPromisesSet)

  return proccesTransFn(...args)
}

module.exports = async (
  proccesTransFn,
  ...args
) => {
  const _transactionPromise = _manageTrans(
    proccesTransFn,
    ...args
  )

  _transactionPromisesSet.add(_transactionPromise)

  try {
    const res = await _transactionPromise
    _transactionPromisesSet.delete(_transactionPromise)

    return res
  } catch (err) {
    _transactionPromisesSet.delete(_transactionPromise)

    throw err
  }
}
