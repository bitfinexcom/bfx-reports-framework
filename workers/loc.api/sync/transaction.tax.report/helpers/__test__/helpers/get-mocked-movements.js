'use strict'

module.exports = (mockMovements, opts) => {
  const missingFields = {
    _id: 1,
    id: 1,
    currencyName: 'CCY_NAME_EXAMPLE',
    status: 'COMPLETED',
    amountUsd: null, // It's not used here
    fee: -0.5,
    destinationAddress: '12345qwerty54321',
    transactionId: 'qwerty12345ytrewq',
    note: 'Mocked movements',
    subUserId: null,
    user_id: 1
  }

  return mockMovements.map((movement, i) => {
    const mtsUpdated = opts?.year
      ? new Date(movement.mtsUpdated).setUTCFullYear(opts?.year)
      : movement.mtsUpdated

    return {
      ...missingFields,

      _id: i + 1,
      id: i + 1,

      ...movement,

      mtsStarted: mtsUpdated - 60000,
      mtsUpdated
    }
  })
}
