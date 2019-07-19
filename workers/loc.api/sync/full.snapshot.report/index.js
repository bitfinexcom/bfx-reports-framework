'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

class FullSnapshotReport {
  constructor (
    rService,
    positionsSnapshot
  ) {
    this.rService = rService
    this.positionsSnapshot = positionsSnapshot
  }

  async getFullSnapshotReport (args) {
    const { params = {} } = { ...args }
    const { end = Date.now() } = { ...params }
    const date = new Date(end)
    const dayMts = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1
    ) - 1
    const walletsArgs = {
      ...args,
      params: {
        ...params,
        end: dayMts
      }
    }

    const positionsSnapshot = await this.positionsSnapshot
      .getPositionsSnapshot(args)
    const walletsSnapshot = await this.rService.getWallets(
      null,
      walletsArgs
    )

    const res = {
      positionsSnapshot,
      walletsSnapshot
    }

    return res
  }
}

decorate(injectable(), FullSnapshotReport)
decorate(inject(TYPES.RService), FullSnapshotReport, 0)
decorate(inject(TYPES.PositionsSnapshot), FullSnapshotReport, 1)

module.exports = FullSnapshotReport
