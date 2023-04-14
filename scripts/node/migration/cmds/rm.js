'use strict'

const {
  SUPPORTED_DB_VERSION
} = require('../../../../workers/loc.api/sync/schema')

module.exports = {
  command: 'rm [totally]',
  desc: 'Remove redundant migration files',
  builder: (yargs) => {
    yargs
      .positional('totally', {
        describe: 'Should it be removed totally, if not it will be moved to the trash folder',
        type: 'boolean',
        default: false,
        alias: 't'
      })
  },

  // TODO:
  handler: (argv) => {
    const shouldBeRemoved = argv.totally
    const fileNames = [] // TODO:
    const strFileNames = fileNames.reduce((accum, name) => (
      `${accum}  - ${name}\n`
    ), '')

    if (shouldBeRemoved) {
      console.log('Remover redundant migration files:'.blue)
      console.log(strFileNames.red)

      return
    }

    console.log('Moved redundant migration files to the trash folder:'.blue)
    console.log(strFileNames.yellow)
  }
}
