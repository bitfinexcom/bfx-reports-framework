'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

class FullSnapshotReport {
  constructor (
    wallets,
    positionsSnapshot
  ) {
    this.wallets = wallets
    this.positionsSnapshot = positionsSnapshot
  }

  async getFullSnapshotReport (args) {
    const { params = {} } = { ...args }
    const { end = Date.now() } = { ...params }

    const _args = {
      ...args,
      params: {
        ...params,
        end
      }
    }

    const {
      positionsSnapshot,
      tickers
    } = await this.positionsSnapshot
      .getPositionsSnapshotAndTickers(_args)
    const walletsSnapshot = await this.wallets
      .getWalletsConvertedByPublicTrades(_args)

    return {
      positionsSnapshot,
      walletsSnapshot,
      tickers
    }
  }
}

decorate(injectable(), FullSnapshotReport)
decorate(inject(TYPES.Wallets), FullSnapshotReport, 0)
decorate(inject(TYPES.PositionsSnapshot), FullSnapshotReport, 1)

module.exports = FullSnapshotReport
