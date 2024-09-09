'use strict'

const { orderBy } = require('lodash')
const { merge } = require('lib-js-util-base')

const { pushLargeArr } = require('../../helpers/utils')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.ALLOWED_COLLS,
  TYPES.Authenticator
]
class Movements {
  constructor (
    dao,
    syncSchema,
    ALLOWED_COLLS,
    authenticator
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.authenticator = authenticator

    this.movementsModelFields = this.syncSchema
      .getModelOf(this.ALLOWED_COLLS.MOVEMENTS)
      .getModelFields()
    this.ledgersModelFields = this.syncSchema
      .getModelOf(this.ALLOWED_COLLS.LEDGERS)
      .getModelFields()
  }

  async getMovements (params = {}) {
    const {
      auth = {},
      start = 0,
      end = Date.now(),
      filter: _filter,
      sort = [['mtsUpdated', -1]],
      projection = this.movementsModel,
      exclude = ['user_id'],
      isExcludePrivate = true,
      isWithdrawals = false,
      isDeposits = false,
      isMovementsWithoutSATransferLedgers = false,
      areExtraPaymentsIncluded = false
    } = params ?? {}

    const user = await this.authenticator
      .verifyRequestUser({ auth })

    const withdrawalsFilter = isWithdrawals
      ? {
          $not: { status: 'CANCELED' },
          $lt: { amount: 0 },
          $gte: { mtsStarted: start },
          $lte: { mtsStarted: end }
        }
      : {}
    const depositsFilter = isDeposits
      ? {
          $eq: { status: 'COMPLETED' },
          $gt: { amount: 0 },
          $gte: { mtsUpdated: start },
          $lte: { mtsUpdated: end }
        }
      : {}
    const filter = merge(
      {},
      withdrawalsFilter,
      depositsFilter,
      _filter
    )

    const movementsPromise = this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.MOVEMENTS,
      {
        filter: {
          $gte: { mtsUpdated: start },
          $lte: { mtsUpdated: end },
          user_id: user._id,
          ...filter
        },
        sort,
        projection,
        exclude,
        isExcludePrivate
      }
    )

    const ledgersOrder = this._getLedgersOrder(sort)
    const extraMovementsPromise = this.getExtraMovements({
      auth: user,
      start,
      end,
      sort: ledgersOrder,
      isWithdrawals,
      isDeposits,
      isExcludePrivate,
      areExtraPaymentsIncluded
    })

    if (isMovementsWithoutSATransferLedgers) {
      const [
        movements,
        extraMovements
      ] = await Promise.all([
        movementsPromise,
        extraMovementsPromise
      ])

      const remapedLedgers = this._remapLedgersToMovements(
        extraMovements
      )
      pushLargeArr(movements, remapedLedgers)
      const {
        propNames,
        orders
      } = this._getLodashOrder(sort)
      const orderedRes = orderBy(
        movements,
        propNames,
        orders
      )

      return orderedRes
    }

    const ledgersPromise = this.getSubAccountsTransferLedgers({
      auth: user,
      start,
      end,
      sort: ledgersOrder,
      isWithdrawals,
      isDeposits,
      isExcludePrivate
    })

    const [
      movements,
      extraMovements,
      ledgers
    ] = await Promise.all([
      movementsPromise,
      extraMovementsPromise,
      ledgersPromise
    ])

    pushLargeArr(extraMovements, ledgers)
    const remapedLedgers = this._remapLedgersToMovements(
      extraMovements
    )
    pushLargeArr(movements, remapedLedgers)

    const {
      propNames,
      orders
    } = this._getLodashOrder(sort)
    const orderedRes = orderBy(
      movements,
      propNames,
      orders
    )

    return orderedRes
  }

  /*
   * Consider the `SA(nameAccount1->nameAccount2)` transfers
   * as internal movements for win/loss and tax calculations
   */
  getSubAccountsTransferLedgers (params = {}) {
    const {
      auth = {},
      start = 0,
      end = Date.now(),
      filter: _filter,
      sort = [['mts', -1], ['id', -1]],
      projection = this.ledgersModelFields,
      exclude = ['user_id'],
      isExcludePrivate = true,
      isWithdrawals = false,
      isDeposits = false
    } = params ?? {}

    const withdrawalsFilter = isWithdrawals
      ? { $lt: { amount: 0 } }
      : {}
    const depositsFilter = isDeposits
      ? { $gt: { amount: 0 } }
      : {}
    const filter = merge(
      {},
      withdrawalsFilter,
      depositsFilter,
      _filter
    )

    return this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      {
        filter: {
          $eq: { _isSubAccountsTransfer: 1 },
          $lte: { mts: end },
          $gte: { mts: start },
          user_id: auth._id,
          ...filter
        },
        sort,
        projection,
        exclude,
        isExcludePrivate
      }
    )
  }

  /*
   * Considers the following additional movements from ledgers:
   *   - `InvoicePay Order`
   *   - `Airdrop on wallet`
   */
  getExtraMovements (params = {}) {
    const {
      auth = {},
      start = 0,
      end = Date.now(),
      filter: _filter,
      sort = [['mts', -1], ['id', -1]],
      projection = this.ledgersModelFields,
      exclude = ['user_id'],
      isExcludePrivate = true,
      isWithdrawals = false,
      isDeposits = false,
      areExtraPaymentsIncluded = false
    } = params ?? {}

    const withdrawalsFilter = isWithdrawals
      ? { $lt: { amount: 0 } }
      : {}
    const depositsFilter = isDeposits
      ? { $gt: { amount: 0 } }
      : {}
    const filter = merge(
      {},
      withdrawalsFilter,
      depositsFilter,
      _filter
    )
    const extraPaymentsFilter = areExtraPaymentsIncluded
      ? {
          $or: {
            $eq: {
              _isInvoicePayOrder: 1,
              _isAirdropOnWallet: 1,
              _isMarginFundingPayment: 1,
              _isAffiliateRebate: 1,
              _isStakingPayments: 1
            }
          }
        }
      : { $or: { $eq: { _isInvoicePayOrder: 1 } } }

    return this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      {
        subQuery: {
          filter: extraPaymentsFilter
        },
        filter: {
          $lte: { mts: end },
          $gte: { mts: start },
          user_id: auth._id,
          ...filter
        },
        sort,
        projection,
        exclude,
        isExcludePrivate
      }
    )
  }

  _remapLedgersToMovements (ledgers) {
    return ledgers.map((ledger) => {
      const {
        mts,
        currency,
        amount,
        amountUsd,
        subUserId,
        _id,
        exactUsdValue,

        _isAirdropOnWallet,
        _isMarginFundingPayment,
        _isAffiliateRebate,
        _isStakingPayments
      } = ledger

      return {
        id: null,
        currency,
        currencyName: currency,
        mtsStarted: mts,
        mtsUpdated: mts,
        status: null,
        amount,
        amountUsd,
        fees: null,
        destinationAddress: '',
        transactionId: '',
        note: '',
        subUserId,
        isLedgers: true,
        _id,
        exactUsdValue,

        _isAirdropOnWallet,
        _isMarginFundingPayment,
        _isAffiliateRebate,
        _isStakingPayments
      }
    })
  }

  _getLedgersOrder (sort) {
    const orderSign = (
      Array.isArray(sort) &&
      Array.isArray(sort[0]) &&
      Number.isFinite(sort[0][1])
    )
      ? Math.sign(sort[0][1])
      : -1

    return [['mts', orderSign], ['id', orderSign]]
  }

  _getLodashOrder (sort) {
    const propNames = []
    const orders = []

    if (
      !Array.isArray(sort) ||
      sort.length === 0
    ) {
      return { propNames, orders }
    }

    return sort.reduce((accum, item) => {
      if (
        item[0] &&
        typeof item[0] === 'string' &&
        Number.isFinite(item[1])
      ) {
        const currOrder = item[1] < 0
          ? 'desc'
          : 'asc'

        accum.propNames.push(item[0])
        accum.orders.push(currOrder)
      }

      return accum
    }, { propNames, orders })
  }
}

decorateInjectable(Movements, depsTypes)

module.exports = Movements
