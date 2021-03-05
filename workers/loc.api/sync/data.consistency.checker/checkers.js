'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')
const CHECKER_NAMES = require('./checker.names')

class Checkers {
  constructor (
    SYNC_API_METHODS,
    syncCollsManager
  ) {
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.syncCollsManager = syncCollsManager
  }

  [CHECKER_NAMES.WALLETS] (auth) {
    return this.syncCollsManager
      .haveCollsBeenSyncedUpToDate({
        auth,
        params: {
          schema: [
            this.SYNC_API_METHODS.LEDGERS,
            this.SYNC_API_METHODS.CANDLES
          ]
        }
      })
  }

  [CHECKER_NAMES.BALANCE_HISTORY] (auth) {
    return this.syncCollsManager
      .haveCollsBeenSyncedUpToDate({
        auth,
        params: {
          schema: [
            this.SYNC_API_METHODS.LEDGERS,
            this.SYNC_API_METHODS.CANDLES
          ]
        }
      })
  }

  [CHECKER_NAMES.WIN_LOSS] (auth) {
    return this.syncCollsManager
      .haveCollsBeenSyncedUpToDate({
        auth,
        params: {
          schema: [
            this.SYNC_API_METHODS.LEDGERS,
            this.SYNC_API_METHODS.CANDLES,
            this.SYNC_API_METHODS.MOVEMENTS,
            this.SYNC_API_METHODS.POSITIONS_SNAPSHOT
          ]
        }
      })
  }

  [CHECKER_NAMES.POSITIONS_SNAPSHOT] (auth) {
    return this.syncCollsManager
      .haveCollsBeenSyncedUpToDate({
        auth,
        params: {
          schema: [
            this.SYNC_API_METHODS.CANDLES,
            this.SYNC_API_METHODS.POSITIONS_SNAPSHOT,
            this.SYNC_API_METHODS.POSITIONS_HISTORY
          ]
        }
      })
  }

  [CHECKER_NAMES.FULL_SNAPSHOT_REPORT] (auth) {
    return this.syncCollsManager
      .haveCollsBeenSyncedUpToDate({
        auth,
        params: {
          schema: [
            this.SYNC_API_METHODS.LEDGERS,
            this.SYNC_API_METHODS.CANDLES,
            this.SYNC_API_METHODS.POSITIONS_SNAPSHOT,
            this.SYNC_API_METHODS.POSITIONS_HISTORY
          ]
        }
      })
  }

  [CHECKER_NAMES.FULL_TAX_REPORT] (auth) {
    return this.syncCollsManager
      .haveCollsBeenSyncedUpToDate({
        auth,
        params: {
          schema: [
            this.SYNC_API_METHODS.LEDGERS,
            this.SYNC_API_METHODS.CANDLES,
            this.SYNC_API_METHODS.MOVEMENTS,
            this.SYNC_API_METHODS.POSITIONS_SNAPSHOT,
            this.SYNC_API_METHODS.POSITIONS_HISTORY
          ]
        }
      })
  }

  [CHECKER_NAMES.TRADED_VOLUME] (auth) {
    return this.syncCollsManager
      .haveCollsBeenSyncedUpToDate({
        auth,
        params: {
          schema: [
            this.SYNC_API_METHODS.TRADES,
            this.SYNC_API_METHODS.CANDLES
          ]
        }
      })
  }

  [CHECKER_NAMES.FEES_REPORT] (auth) {
    return this.syncCollsManager
      .haveCollsBeenSyncedUpToDate({
        auth,
        params: {
          schema: [
            this.SYNC_API_METHODS.TRADES,
            this.SYNC_API_METHODS.CANDLES
          ]
        }
      })
  }

  async [CHECKER_NAMES.PERFORMING_LOAN] (auth) {
    const {
      _id: userId,
      subUsers,
      isSubAccount
    } = { ...auth }

    if (!isSubAccount) {
      return this.syncCollsManager
        .hasCollBeenSyncedAtLeastOnce({
          userId,
          collName: this.SYNC_API_METHODS.LEDGERS
        })
    }

    for (const subUser of subUsers) {
      const { _id: subUserId } = { ...subUser }
      const isValid = await this.syncCollsManager
        .hasCollBeenSyncedAtLeastOnce({
          userId,
          subUserId,
          collName: this.SYNC_API_METHODS.LEDGERS
        })

      if (!isValid) {
        return false
      }
    }

    return true
  }
}

decorate(injectable(), Checkers)
decorate(inject(TYPES.SYNC_API_METHODS), Checkers, 0)
decorate(inject(TYPES.SyncCollsManager), Checkers, 1)

module.exports = Checkers
