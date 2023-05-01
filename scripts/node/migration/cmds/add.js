'use strict'

const path = require('path')
const fs = require('fs')

const {
  SUPPORTED_DB_VERSION
} = require('../../../../workers/loc.api/sync/schema')

const migrationFolderPath = path.join(
  __dirname,
  '../../../../workers/loc.api/sync/dao/db-migrations/sqlite-migrations'
)
const migrationTemplate = fs.readFileSync(
  path.join(__dirname, 'migration-template.js.temp'),
  'utf8'
)
const placeholderPattern = /#\{[a-zA-Z0-9]+\}/g

const _renderMigrationTemplate = (
  template,
  params = {}
) => {
  const str = template.replace(placeholderPattern, (match) => {
    const propName = match.replace('#{', '').replace('}', '')

    if (
      !Number.isFinite(params?.[propName]) &&
      typeof params?.[propName] !== 'string'
    ) {
      return ''
    }

    return params[propName]
  })

  return str
}

module.exports = {
  command: 'add [ver|next]',
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

  handler: (argv) => {
    const mts = Date.now()
    const timestamp = new Date(mts).toISOString()
    const version = argv.next
      ? SUPPORTED_DB_VERSION + 1
      : argv.ver

    const migrationBody = _renderMigrationTemplate(
      migrationTemplate,
      { timestamp, version }
    )
    const migrationFileName = `migration.v${version}.${mts}.js`
    const migrationFilePath = path.join(
      migrationFolderPath,
      migrationFileName
    )

    const migrationFileDirents = fs.readdirSync(
      migrationFolderPath,
      { withFileTypes: true }
    )

    const currMigrationVersionDirent = migrationFileDirents.find((dirent) => (
      dirent.isFile() &&
      new RegExp(`^migration.v${version}.\\d+.js$`).test(dirent.name)
    ))

    if (currMigrationVersionDirent?.name) {
      console.log(
        'DB migration file'.blue, `v${version}`.yellow, 'already exists, file name:'.blue,
        `\n  - ${currMigrationVersionDirent.name}`.yellow,
        '\n'
      )

      return
    }

    fs.writeFileSync(
      migrationFilePath,
      migrationBody,
      {
        encoding: 'utf8',
        mode: '664'
      }
    )

    console.log(
      'Added a new DB migration file:'.blue,
      `\n  - ${migrationFileName}`.green,
      '\n'
    )
  }
}
