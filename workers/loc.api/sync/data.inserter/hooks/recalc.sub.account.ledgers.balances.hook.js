'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../../di/types')
const DataInserterHook = require('./data.inserter.hook')
const {
  SubAccountLedgersBalancesRecalcError
} = require('../../../errors')

class RecalcSubAccountLedgersBalancesHook extends DataInserterHook {
  constructor (
    dao,
    TABLES_NAMES
  ) {
    super()

    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
  }

  _getSubUsersIdsByMasterUserId (auth, id) {
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

  _getRecalcBalance (auth, elems, item) {
    const {
      mts,
      wallet,
      currency,
      user_id: id,
      _nativeBalance,
      _nativeBalanceUsd
    } = { ...item }
    const subUsersIds = this._getSubUsersIdsByMasterUserId(auth, id)

    if (
      !Array.isArray(subUsersIds) ||
      subUsersIds.length === 0
    ) {
      return {
        balance: _nativeBalance,
        balanceUsd: _nativeBalanceUsd
      }
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
    const subUsersBalancesUsd = []

    for (const subUserId of subUsersIds) {
      const _item = _elems
        .find(({ subUserId: sId }) => subUserId === sId)
      const {
        _nativeBalance: balance,
        _nativeBalanceUsd: balanceUsd
      } = { ..._item }

      if (Number.isFinite(balance)) {
        subUsersBalances.push(balance)
      }
      if (Number.isFinite(balanceUsd)) {
        subUsersBalancesUsd.push(balanceUsd)
      }
    }

    const _balance = subUsersBalances
      .reduce((accum, balance) => {
        return Number.isFinite(balance)
          ? accum + balance
          : accum
      }, 0)
    const _balanceUsd = subUsersBalancesUsd
      .reduce((accum, balance) => {
        return Number.isFinite(balance)
          ? accum + balance
          : accum
      }, 0)

    const balance = subUsersBalances.length === 0
      ? _nativeBalance
      : _balance
    const balanceUsd = subUsersBalancesUsd.length === 0
      ? _nativeBalanceUsd
      : _balanceUsd

    return {
      balance,
      balanceUsd
    }
  }

  _getRecalcBalanceAsync (
    auth,
    recordsToGetBalances,
    elem
  ) {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        try {
          const res = this._getRecalcBalance(
            auth,
            recordsToGetBalances,
            elem
          )

          resolve(res)
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  _getFirstGroupedRecords (elems = []) {
    return elems.reduce((accum, curr) => {
      const {
        wallet,
        currency,
        user_id: userId,
        subUserId
      } = { ...curr }
      const hasNotGroup = accum.every(({
        wallet: _wallet,
        currency: _currency,
        user_id: _userId,
        subUserId: _subUserId
      }) => (
        wallet !== _wallet ||
        currency !== _currency ||
        userId !== _userId ||
        subUserId !== _subUserId
      ))

      if (hasNotGroup) {
        accum.push({ ...curr })
      }

      return accum
    }, [])
  }

  async _getInitialElems (
    auth,
    firstGroupedRecords = []
  ) {
    const res = []

    for (const elem of firstGroupedRecords) {
      const {
        mts,
        wallet,
        currency,
        user_id: id,
        subUserId: _subUserId
      } = { ...elem }
      const subUsersIds = this._getSubUsersIdsByMasterUserId(auth, id)

      if (
        !Array.isArray(subUsersIds) ||
        subUsersIds.length === 0
      ) {
        continue
      }

      const emptyRes = {
        mts,
        wallet,
        currency,
        user_id: id,
        _nativeBalance: null,
        _nativeBalanceUsd: null
      }

      for (const subUserId of subUsersIds) {
        if (subUserId === _subUserId) {
          continue
        }

        const itemFromDb = await this.dao.getElemInCollBy(
          this.TABLES_NAMES.LEDGERS,
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

        res.push({
          ...emptyRes,
          ...itemFromDb,
          subUserId
        })
      }
    }

    return res
  }

  /**
   * @override
   */
  async execute () {
    const dataInserter = this.getDataInserter()
    const auth = dataInserter.getAuth()

    if (
      !auth ||
      !(auth instanceof Map) ||
      auth.size === 0
    ) {
      throw new SubAccountLedgersBalancesRecalcError()
    }

    const firstNotRecalcedElem = await this.dao.getElemInCollBy(
      this.TABLES_NAMES.LEDGERS,
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

    while (true) {
      count += 1

      if (count > 100) break

      const elems = await this.dao.getElemsInCollBy(
        this.TABLES_NAMES.LEDGERS,
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

      const firstGroupedRecords = this._getFirstGroupedRecords(elems)
      const initialElems = await this._getInitialElems(
        auth,
        firstGroupedRecords
      )
      const recordsToGetBalances = [
        ...initialElems,
        ...elems
      ]
      const recalcElems = []

      for (const elem of elems) {
        const {
          balance,
          balanceUsd
        } = await this._getRecalcBalanceAsync(
          auth,
          recordsToGetBalances,
          elem
        )

        recalcElems.push({
          ...elem,
          balance,
          balanceUsd,
          _isBalanceRecalced: 1
        })
      }

      await this.dao.updateElemsInCollBy(
        this.TABLES_NAMES.LEDGERS,
        recalcElems,
        ['_id'],
        ['balance', 'balanceUsd', '_isBalanceRecalced']
      )

      const lastElem = elems[elems.length - 1]

      mts = lastElem.mts
      skipedIds = elems
        .filter(({ mts: _mts }) => mts === _mts)
        .map(({ _id }) => _id)
    }
  }
}

decorate(injectable(), RecalcSubAccountLedgersBalancesHook)
decorate(inject(TYPES.DAO), RecalcSubAccountLedgersBalancesHook, 0)
decorate(inject(TYPES.TABLES_NAMES), RecalcSubAccountLedgersBalancesHook, 1)

module.exports = RecalcSubAccountLedgersBalancesHook
