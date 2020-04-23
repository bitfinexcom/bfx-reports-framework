'use strict'

const _isContainedPosStatus = (positions, status) => {
  return positions.every(pos => (
    !pos ||
    typeof pos !== 'object' ||
    pos.status !== status
  ))
}

module.exports = (
  rService,
  dao,
  ALLOWED_COLLS
) => async ({
  args,
  symbol,
  end,
  id
}) => {
  const { auth } = { ...args }
  const { session: user } = { ...auth }
  const { subUser } = { ...user }
  const { _id: subUserId } = { ...subUser }
  const subUserIdFilter = Number.isInteger(subUserId)
    ? { subUserId }
    : {}
  const symbArr = Array.isArray(symbol)
    ? symbol
    : [symbol]
  const symbFilter = symbArr.length !== 0
    ? { $in: { symbol: symbArr } }
    : {}

  const trades = await dao.getElemsInCollBy(
    ALLOWED_COLLS.TRADES,
    {
      filter: {
        user_id: user._id,
        ...subUserIdFilter,
        $lte: { mtsCreate: end },
        ...symbFilter
      },
      limit: 2,
      sort: [['mtsCreate', -1]]
    }
  )

  const {
    res: positionsAudit
  } = await rService.getPositionsAudit(
    null,
    {
      auth: (subUser && typeof subUser) ? subUser : user,
      params: {
        id: [id],
        limit: 2,
        notThrowError: true,
        notCheckNextPage: true
      }
    }
  )

  if (
    !Array.isArray(trades) ||
    trades.length === 0 ||
    !Array.isArray(positionsAudit) ||
    positionsAudit.length < 2 ||
    _isContainedPosStatus(positionsAudit, 'CLOSED') ||
    _isContainedPosStatus(positionsAudit, 'ACTIVE')
  ) {
    return {
      closePrice: null,
      sumAmount: null
    }
  }
  if (
    trades.length > 1 &&
    trades[0] &&
    typeof trades[0] === 'object' &&
    trades[1] &&
    typeof trades[1] === 'object' &&
    trades[0].orderID &&
    trades[0].orderID !== trades[1].orderID
  ) {
    const activePosition = positionsAudit.find(pos => (
      pos.status === 'ACTIVE'
    ))

    return {
      closePrice: trades[0].execPrice,
      sumAmount: activePosition.amount
    }
  }

  const _ledgers = await dao.getElemsInCollBy(
    ALLOWED_COLLS.LEDGERS,
    {
      filter: {
        user_id: user._id,
        ...subUserIdFilter,
        $lte: { mts: end }
      },
      limit: 2500,
      sort: [['mts', -1]]
    }
  )
  const ledgers = Array.isArray(_ledgers) ? _ledgers : []

  const regexp = new RegExp(`#${id}.*settlement`, 'gi')
  const closedPosition = ledgers.find(ledger => (
    ledger &&
    typeof ledger === 'object' &&
    regexp.test(ledger.description)
  ))

  const closePrice = (
    closedPosition &&
    typeof closedPosition === 'object' &&
    closedPosition.description &&
    typeof closedPosition.description === 'string'
  )
    ? closedPosition.description
    : null

  return {
    closePrice,
    sumAmount: null
  }
}
