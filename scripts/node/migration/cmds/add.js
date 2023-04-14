'use strict'

const {
  SUPPORTED_DB_VERSION
} = require('../../../../workers/loc.api/sync/schema')

module.exports = {
  command: 'add [version]',
  desc: 'Add a new DB migration file',
  builder: (yargs) => {
    yargs
      .positional('ver', {
        describe: 'Version of adding DB migration',
        type: 'number',
        default: SUPPORTED_DB_VERSION,
        alias: 'v'
      })
      .positional('next', {
        describe: 'Should it be used next version against the DB schema version',
        type: 'boolean',
        default: false,
        alias: 'n'
      })
  },

  // TODO:
  handler: (argv) => {
    const version = argv.next
      ? SUPPORTED_DB_VERSION + 1
      : argv.ver

    console.log('Added a new DB migration file'.bgBlue, `${version}`.bgGreen)
  }
}
