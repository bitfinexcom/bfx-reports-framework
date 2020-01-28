'use strict'

// TODO:
const _getRecalcBalance = async (dao, elems, item) => {
  const { mts, wallet, currency, user_id } = { ...item }
  const _elems = [...elems[0], ...elems[1]]
    .filter(({
      subUserId,
      mts: _mts,
      user_id: _userId
    }) => (
      Number.isInteger(subUserId) &&
      _mts <= mts
    ))
}

const _addFreshSelection = (
  lastTwoSelectionElems,
  elems = []
) => {
  lastTwoSelectionElems.splice(0, 1)
  lastTwoSelectionElems.push(elems)
}

module.exports = (
  dao,
  TABLES_NAMES
) => async () => {
  const lastTwoSelectionElems = []

  let count = 0
  let mts = 0
  let skipedIds = []

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
        sort: [['mts', 1], ['_id', 1]],
        limit: 20000
      }
    )

    if (
      !Array.isArray(elems) ||
      elems.length === 0
    ) {
      break
    }

    _addFreshSelection(lastTwoSelectionElems, elems)
    const recalcElems = []

    for (const elem of elems) {
      const balance = await _getRecalcBalance(
        dao,
        lastTwoSelectionElems,
        elem
      )

      recalcElems.push({
        ...elem,
        balance
      })
    }

    await dao.updateElemsInCollBy(
      TABLES_NAMES.LEDGERS,
      recalcElems,
      ['_id'],
      ['balance']
    )

    const lastElem = elems[elems.length - 1]
    mts = lastElem.mts
    skipedIds = elems
      .filter(({ mts: _mts }) => mts === _mts)
      .map(({ _id }) => _id)
  }
}
