'use strict'

const path = require('path')
const fs = require('fs')
const moment = require('moment')
const { orderBy } = require('lodash')

const {
  SUPPORTED_DB_VERSION
} = require('../../../../workers/loc.api/sync/schema')

const migrationFolderPath = path.join(
  __dirname,
  '../../../../workers/loc.api/sync/dao/db-migrations/sqlite-migrations'
)
const trashFolderPath = path.join(
  migrationFolderPath,
  'trash'
)

const _getMigrationFileMetadata = (migrationFileDirents) => {
  const metadata = migrationFileDirents.reduce((accum, dirent) => {
    if (
      !dirent.isFile() ||
      !/^migration.v\d+.?\d*.js$/.test(dirent.name)
    ) {
      return accum
    }

    const splitName = dirent.name.split('.')
    const version = Number.parseInt(splitName[1].replace('v', ''))
    const parsedMts = Number.parseInt(splitName[2])
    const mts = Number.isNaN(parsedMts) ? 0 : parsedMts

    if (Number.isNaN(version)) {
      return accum
    }

    accum.push({
      name: dirent.name,
      version,
      mts
    })

    return accum
  }, [])

  return orderBy(
    metadata,
    ['version', 'mts'],
    ['asc', 'asc']
  )
}

const _getFileNamesStr = (fileNames) => {
  return fileNames.reduce((accum, dirent) => (
    `${accum}  - ${dirent?.name ?? dirent}\n`
  ), '')
}

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
      .positional('recover', {
        describe: 'Should trash folder migration files be recovered',
        type: 'boolean',
        default: false,
        alias: 'r'
      })
  },

  handler: (argv) => {
    const shouldBeRemoved = argv.totally
    const shouldBeRecovered = argv.recover

    if (shouldBeRecovered) {
      const tempMigrationFileDirents = fs.readdirSync(
        trashFolderPath,
        { withFileTypes: true }
      )
      const tempMigrationFileMetadata = _getMigrationFileMetadata(
        tempMigrationFileDirents
      )
      const strRecoveringFileNames = _getFileNamesStr(tempMigrationFileMetadata)

      for (const metadata of tempMigrationFileMetadata) {
        fs.renameSync(
          path.join(trashFolderPath, metadata.name),
          path.join(migrationFolderPath, metadata.name)
        )
      }

      console.log('Recovered trash folder migration files:'.blue)
      console.log(strRecoveringFileNames.yellow)

      return
    }

    const mts = Date.now()
    const momentMts = moment.utc(mts)
    const maxAllowedMts = momentMts.subtract(6, 'months')
      .valueOf()

    const migrationFileDirents = fs.readdirSync(
      migrationFolderPath,
      { withFileTypes: true }
    )
    const migrationFileMetadata = _getMigrationFileMetadata(
      migrationFileDirents
    )

    const removingFileNames = []
    const removingFilePaths = []

    for (const metadata of migrationFileMetadata) {
      const nonRemovableFilesAmount = (migrationFileMetadata.length -
        removingFileNames.length)

      if (
        metadata.version === SUPPORTED_DB_VERSION ||
        nonRemovableFilesAmount <= 10 ||
        maxAllowedMts <= metadata.mts
      ) {
        break
      }

      removingFileNames.push(metadata.name)
      removingFilePaths.push(path.join(
        migrationFolderPath,
        metadata.name
      ))
    }

    const strRemovingFileNames = _getFileNamesStr(removingFileNames)

    if (shouldBeRemoved) {
      for (const filePaths of removingFilePaths) {
        fs.rmSync(filePaths, { maxRetries: 10, recursive: true })
      }

      console.log('Removed redundant migration files:'.blue)
      console.log(strRemovingFileNames.red)

      return
    }

    fs.mkdirSync(trashFolderPath, { recursive: true })
    for (const [i, filePaths] of removingFilePaths.entries()) {
      fs.renameSync(
        filePaths,
        path.join(trashFolderPath, removingFileNames[i])
      )
    }

    console.log('Moved redundant migration files to the trash folder:'.blue)
    console.log(strRemovingFileNames.yellow)
  }
}
