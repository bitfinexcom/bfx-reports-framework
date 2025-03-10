'use strict'

const BigNumber = require('bignumber.js')
const { setImmediate } = require('node:timers/promises')

// TODO:
module.exports = async (trades, opts) => {
  const {
    interrupter
  } = opts ?? {}

  if (
    !Array.isArray(trades) ||
    trades.length === 0
  ) {
    return []
  }

  let lastLoopUnlockMts = Date.now()

  for (const trade of trades) {
    if (interrupter?.hasInterrupted()) {
      return []
    }

    const currentLoopUnlockMts = Date.now()

    /*
     * Trx hist restoring is a hard sync operation,
     * to prevent EventLoop locking more than 1sec
     * it needs to resolve async queue
     */
    if ((currentLoopUnlockMts - lastLoopUnlockMts) > 1000) {
      await setImmediate()

      lastLoopUnlockMts = currentLoopUnlockMts
    }
  }

  return [
    {
      asset: 'BTCF0:USTF0',
      amount: 123,
      mtsAcquired: null,
      mtsSold: null,
      proceeds: 200,
      cost: 100,
      gainOrLoss: 123,
      type: 'DERIVATIVE'
    }
  ]
}
