'use strict'

const { pick } = require('lodash')
const Ajv = require('ajv')
const async = require('async')
const Base = require('bfx-facs-base')

const {
  getMethodCollMap,
  getModelsMap
} = require('./sync/schema')
const ALLOWED_COLLS = require('./sync/allowed.colls')
const { DependencyInjectionError } = require('./errors')

class ReportsFrameworkFacility extends Base {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)

    this.name = 'reports-framework'
    this._hasConf = false

    this.core = null

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

  getMethodCollMap () {
    return getMethodCollMap()
  }

  getModelsMap () {
    return getModelsMap()
  }

  getAllowedColls () {
    return ALLOWED_COLLS
  }

  getDISchema () {
    return {
      type: 'object',
      required: [
        'getREST',
        'prepareResponse'
      ],
      properties: {
        getREST: {
          isFunction: true
        },
        prepareResponse: {
          isFunction: true
        }
      }
    }
  }

  injectDeps (core = {}) {
    const ajv = new Ajv()
    ajv.addKeyword('isFunction', {
      validate (isFunction = true, data) {
        return isFunction
          ? typeof data === 'function'
          : typeof data !== 'function'
      }
    })

    if (!ajv.validate(this.getDISchema(), core)) {
      throw new DependencyInjectionError(ajv.errors)
    }

    this.core = core
  }

  _stop (cb) {
    super._stop(cb)
  }
}

module.exports = ReportsFrameworkFacility
