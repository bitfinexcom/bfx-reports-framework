'use strict'

const {
  SubAccountLedgersBalancesRecalcError
} = require('../../../errors')

const _getSubUsersIdsByMasterUserId = (auth, id) => {
  if (!Number.isInteger(id)) {
    return null
  }

  return [...auth]
    .reduce((accum, [key, { masterUserId, subUser }]) => {
      const { _id } = { ...subUser }

      if (
        masterUserId === id &&
        Number.isInteger(_id)
      ) {
        accum.push(_id)
      }

      return accum
    }, [])
}

const _getRecalcBalance = async (
  dao,
  TABLES_NAMES,
  auth,
  elems,
  item
) => {
  const {
    mts,
    wallet,
    currency,
    user_id: id,
    _nativeBalance
  } = { ...item }
  const subUsersIds = _getSubUsersIdsByMasterUserId(auth, id)

  if (
    !Array.isArray(subUsersIds) ||
    subUsersIds.length === 0
  ) {
    return _nativeBalance
  }

  const _elems = elems
    .filter(({
      mts: _mts,
      wallet: _wallet,
      currency: _currency,
      user_id: userId,
      subUserId
    }) => (
      Number.isInteger(subUserId) &&
      userId === id &&
      _mts <= mts &&
      _wallet === wallet &&
      _currency === currency
    ))
    .reverse()
  const subUsersBalances = []

  for (const subUserId of subUsersIds) {
    const _item = _elems
      .find(({ subUserId: sId }) => subUserId === sId)
    const { _nativeBalance: balance } = { ..._item }

    if (Number.isFinite(balance)) {
      subUsersBalances.push(balance)

      continue
    }

    const itemFromDb = await dao.getElemInCollBy(
      TABLES_NAMES.LEDGERS,
      {
        $eq: {
          wallet,
          currency,
          user_id: id,
          subUserId
        },
        $lte: { mts }
      },
      [['mts', -1], ['_id', 1]]
    )
    const { _nativeBalance: balanceFromDb } = { ...itemFromDb }

    if (Number.isFinite(balanceFromDb)) {
      subUsersBalances.push(balanceFromDb)
    }
  }

  if (subUsersBalances.length === 0) {
    return _nativeBalance
  }

  return subUsersBalances.reduce((accum, balance) => {
    return Number.isFinite(balance)
      ? accum + balance
      : accum
  }, 0)
}

const _addFreshSelection = (
  lastTwoSelectionElems,
  elems = []
) => {
  lastTwoSelectionElems.splice(0, 1)
  lastTwoSelectionElems.push(elems)

  return [
    ...lastTwoSelectionElems[0],
    ...lastTwoSelectionElems[1]
  ]
}

module.exports = (
  dao,
  TABLES_NAMES
) => async (dataInserter) => {
  const auth = dataInserter.getAuth()
  const lastTwoSelectionElems = [[], []]

  if (
    !auth ||
    !(auth instanceof Map) ||
    auth.size === 0
  ) {
    throw new SubAccountLedgersBalancesRecalcError()
  }

  const firstNotRecalcedElem = await dao.getElemInCollBy(
    TABLES_NAMES.LEDGERS,
    {
      $isNotNull: 'subUserId',
      $isNull: '_isBalanceRecalced'
    },
    [['mts', 1], ['_id', -1]]
  )

  let { mts } = { ...firstNotRecalcedElem }
  let count = 0
  let skipedIds = []

  if (!mts) {
    return
  }

  console.log('[mts]:'.bgGreen, mts)

  while (true) {
    count += 1

    if (count > 100) break

    const elems = await dao.getElemsInCollBy(
      TABLES_NAMES.LEDGERS,
      {
        filter: {
          $gte: { mts },
          $nin: { _id: skipedIds },
          $isNotNull: 'subUserId'
        },
        sort: [['mts', 1], ['_id', -1]],
        limit: 20000
      }
    )

    if (
      !Array.isArray(elems) ||
      elems.length === 0
    ) {
      break
    }

    const _lastTwoSelectionElems = _addFreshSelection(
      lastTwoSelectionElems,
      elems
    )
    const recalcElems = []

    for (const elem of elems) {
      const balance = await _getRecalcBalance(
        dao,
        TABLES_NAMES,
        auth,
        _lastTwoSelectionElems,
        elem
      )

      recalcElems.push({
        ...elem,
        balance,
        _isBalanceRecalced: 1
      })
    }

    await dao.updateElemsInCollBy(
      TABLES_NAMES.LEDGERS,
      recalcElems,
      ['_id'],
      ['balance', '_isBalanceRecalced']
    )

    const lastElem = elems[elems.length - 1]
    mts = lastElem.mts
    skipedIds = elems
      .filter(({ mts: _mts }) => mts === _mts)
      .map(({ _id }) => _id)
  }
}
