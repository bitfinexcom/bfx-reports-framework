'use strict'

module.exports = (
  dao,
  currencyConverter
) => async (args) => {
  const {
    auth = {},
    params: { end = Date.now() } = {}
  } = { ...args }

  const walletsFromLedgers = await dao.findInCollBy(
    '_getWallets',
    {
      auth,
      params: { end }
    }
  )

  const _wallets = walletsFromLedgers
    .filter(({
      type,
      balance,
      currency
    } = {}) => (
      type &&
      typeof type === 'string' &&
      balance &&
      Number.isFinite(balance) &&
      typeof currency === 'string' &&
      currency.length >= 3
    ))

  const wallets = _wallets.map(w => ({ balanceUsd: null, ...w }))

  return currencyConverter.convertByCandles(
    wallets,
    {
      convertTo: 'USD',
      symbolFieldName: 'currency',
      mts: end,
      convFields: [
        { inputField: 'balance', outputField: 'balanceUsd' }
      ]
    }
  )
}
