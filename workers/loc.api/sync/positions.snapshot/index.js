'use strict'

const { orderBy } = require('lodash')

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const { splitSymbolPairs } = require('../helpers')
const TYPES = require('../../di/types')

class PositionsSnapshot {
  constructor (
    rService,
    dao,
    ALLOWED_COLLS,
    syncSchema,
    currencyConverter,
    authenticator
  ) {
    this.rService = rService
    this.dao = dao
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.syncSchema = syncSchema
    this.currencyConverter = currencyConverter
    this.authenticator = authenticator
  }

  _getPositionsHistory (
    user,
    endMts
  ) {
    const positionsHistoryModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.POSITIONS_HISTORY)

    return this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.POSITIONS_HISTORY,
      {
        filter: {
          user_id: user._id,
          $lte: { mtsCreate: endMts },
          $gte: { mtsUpdate: endMts }
        },
        sort: [['mtsUpdate', -1]],
        projection: positionsHistoryModel,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
    )
  }

  _findPositions (
    positionsAudit,
    reqStatus,
    endMts
  ) {
    return positionsAudit.find((posAudit) => {
      const { mtsUpdate, status } = { ...posAudit }

      if (!Number.isInteger(mtsUpdate)) {
        return false
      }

      return (
        status === reqStatus &&
        mtsUpdate <= endMts
      )
    })
  }

  _findActivePositions (
    positionsAudit,
    endMts
  ) {
    return this._findPositions(
      positionsAudit,
      'ACTIVE',
      endMts
    )
  }

  _findClosedPositions (
    positionsAudit,
    endMts
  ) {
    return this._findPositions(
      positionsAudit,
      'CLOSED',
      endMts
    )
  }

  _getPositionsIds (positionsHistory) {
    return positionsHistory.reduce(
      (accum, { id } = {}) => {
        if (Number.isInteger(id)) {
          accum.push(id)
        }

        return accum
      }, [])
  }

  async _convertPlToUsd (
    pl,
    symbol,
    end
  ) {
    const currency = splitSymbolPairs(symbol)[1]

    if (
      !currency ||
      currency.length < 3 ||
      !Number.isFinite(pl)
    ) {
      return {
        plUsd: null,
        currency
      }
    }

    const plData = { pl, plUsd: null, currency }
    const { plUsd } = await this.currencyConverter.convert(
      plData,
      {
        convertTo: 'USD',
        symbolFieldName: 'currency',
        mts: end,
        convFields: [
          { inputField: 'pl', outputField: 'plUsd' }
        ]
      }
    )

    return {
      plUsd,
      currency
    }
  }

  async _getCalculatedPositions (
    positions,
    end
  ) {
    const positionsSnapshot = []
    const tickers = []

    for (const position of positions) {
      const {
        symbol,
        basePrice,
        amount
      } = { ...position }

      const resPositions = {
        ...position,
        actualPrice: null,
        pl: null,
        plUsd: null,
        plPerc: null
      }

      if (typeof symbol !== 'string') {
        positionsSnapshot.push(resPositions)

        continue
      }

      const actualPrice = await this.currencyConverter
        .getPrice(symbol, end)

      if (
        !Number.isFinite(actualPrice) ||
        !Number.isFinite(basePrice) ||
        !Number.isFinite(amount)
      ) {
        positionsSnapshot.push(resPositions)

        continue
      }

      const pl = (actualPrice - basePrice) * amount
      const plPerc = ((actualPrice / basePrice) - 1) * 100 * Math.sign(amount)
      const {
        plUsd,
        currency
      } = await this._convertPlToUsd(
        pl,
        symbol,
        end
      )

      positionsSnapshot.push({
        ...resPositions,
        actualPrice,
        pl,
        plUsd,
        plPerc
      })

      if (
        currency &&
        currency !== 'USD' &&
        Number.isFinite(pl) &&
        Number.isFinite(plUsd)
      ) {
        const separator = currency.length > 3
          ? ':'
          : ''
        const symbol = `t${currency}${separator}USD`
        const amount = (
          pl !== 0 &&
          plUsd !== 0
        )
          ? plUsd / pl
          : await this.currencyConverter
            .getPrice(symbol, end)

        tickers.push({
          symbol,
          amount
        })
      }
    }

    return {
      positionsSnapshot,
      tickers
    }
  }

  _filterDuplicate (accum = [], curr = []) {
    if (
      !Array.isArray(accum) ||
      accum.length === 0
    ) {
      return [...curr]
    }

    const keys = Object.keys(accum[0]).filter(key => !/^_/.test(key))

    return curr.filter(currItem => {
      return accum.every(accumItem => {
        return keys.some(key => {
          return accumItem[key] !== currItem[key]
        })
      })
    })
  }

  async _getPositionsAudit (
    endMts,
    {
      auth = {},
      params: { ids } = {}
    } = {}
  ) {
    const positionsAudit = []

    for (const id of ids) {
      const singleIdRes = []

      let end = Date.now()
      let prevEnd = end
      let serialRequestsCount = 0

      while (true) {
        const _res = await this.rService.getPositionsAudit(
          null,
          { auth, params: { id: [id], end, limit: 250 } }
        )

        const { res, nextPage } = (
          Object.keys({ ..._res }).every(key => key !== 'nextPage')
        )
          ? { res: _res, nextPage: null }
          : _res

        prevEnd = end
        end = nextPage

        if (
          Array.isArray(res) &&
          res.length === 0 &&
          nextPage &&
          Number.isInteger(nextPage) &&
          serialRequestsCount < 1
        ) {
          serialRequestsCount += 1

          continue
        }

        serialRequestsCount = 0

        if (
          !Array.isArray(res) ||
          res.length === 0
        ) {
          break
        }

        const closedPos = this._findClosedPositions(
          res,
          endMts
        )

        if (
          closedPos &&
          typeof closedPos === 'object'
        ) {
          break
        }

        const activePos = this._findActivePositions(
          res,
          endMts
        )

        if (
          activePos &&
          typeof activePos === 'object'
        ) {
          positionsAudit.push(activePos)

          break
        }

        const resWithoutDuplicate = this._filterDuplicate(
          singleIdRes,
          res
        )
        singleIdRes.push(...resWithoutDuplicate)

        if (
          !Number.isInteger(nextPage) ||
          (
            resWithoutDuplicate.length === 0 &&
            end === prevEnd
          )
        ) {
          break
        }
      }
    }

    return positionsAudit
  }

  async _getActivePositions (
    auth,
    end
  ) {
    const activePositions = await this.rService.getActivePositions(
      null,
      { auth }
    )

    if (
      !Array.isArray(activePositions) ||
      activePositions.length === 0
    ) {
      return []
    }

    return activePositions
      .filter((position) => {
        const { mtsCreate } = { ...position }

        return mtsCreate <= end
      })
  }

  _mergePositions (
    positionsHistory = [],
    activePositions = []
  ) {
    const _activePositions = Array.isArray(activePositions)
      ? activePositions
      : []
    const _positionsHistory = Array.isArray(positionsHistory)
      ? positionsHistory
      : []
    const positions = [
      ..._activePositions,
      ..._positionsHistory
    ]

    return orderBy(positions, ['mtsUpdate'], ['desc'])
  }

  async _getPositionsAuditAndSnapshot (args) {
    const {
      auth = {},
      params = {}
    } = { ...args }
    const {
      end = Date.now()
    } = { ...params }
    const user = await this.authenticator
      .verifyRequestUser({ auth })
    const emptyRes = {
      positionsSnapshot: [],
      tickers: []
    }

    const positionsHistory = await this._getPositionsHistory(
      user,
      end
    )
    const activePositions = await this._getActivePositions(
      auth,
      end
    )
    const positions = this._mergePositions(
      positionsHistory,
      activePositions
    )

    if (
      !Array.isArray(positions) ||
      positions.length === 0
    ) {
      return emptyRes
    }

    const ids = this._getPositionsIds(positions)
    const positionsAudit = await this._getPositionsAudit(
      end,
      { auth, params: { ids } }
    )

    if (
      !Array.isArray(positionsAudit) ||
      positionsAudit.length === 0
    ) {
      return emptyRes
    }

    const {
      positionsSnapshot,
      tickers
    } = await this._getCalculatedPositions(
      positionsAudit,
      end
    )

    return {
      positionsSnapshot,
      tickers
    }
  }

  async getPositionsSnapshot (args) {
    const {
      positionsSnapshot
    } = await this._getPositionsAuditAndSnapshot(args)

    return positionsSnapshot
  }

  async getPositionsSnapshotAndTickers (args) {
    const {
      positionsSnapshot,
      tickers
    } = await this._getPositionsAuditAndSnapshot(args)

    return {
      positionsSnapshot,
      tickers
    }
  }
}

decorate(injectable(), PositionsSnapshot)
decorate(inject(TYPES.RService), PositionsSnapshot, 0)
decorate(inject(TYPES.DAO), PositionsSnapshot, 1)
decorate(inject(TYPES.ALLOWED_COLLS), PositionsSnapshot, 2)
decorate(inject(TYPES.SyncSchema), PositionsSnapshot, 3)
decorate(inject(TYPES.CurrencyConverter), PositionsSnapshot, 4)
decorate(inject(TYPES.Authenticator), PositionsSnapshot, 5)

module.exports = PositionsSnapshot
