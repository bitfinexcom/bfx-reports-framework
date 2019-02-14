'use strict'

process.versions.electron = process.env.ELECTRON_VERSION

const worker = require('bfx-svc-boot-js')
module.exports = worker
