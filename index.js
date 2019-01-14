'use strict'

const { pick } = require('lodash')
const async = require('async')
const Base = require('bfx-facs-base')

class ReportsFrameworkFacility extends Base {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)

    this.name = 'reports-framework'
    this._hasConf = false

    this.init()
  }

  _start (cb) {
    async.series([
      next => {
        super._start(next)
      },
      next => {
        this.params = pick(
          { ...this.opts },
          [
            'name'
          ]
        )

        next()
      }
    ], cb)
  }

  _stop (cb) {
    super._stop(cb)
  }
}

module.exports = ReportsFrameworkFacility
