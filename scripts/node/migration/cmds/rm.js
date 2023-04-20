'use strict'

const path = require('path')
const fs = require('fs')
const moment = require('moment')

const {
  SUPPORTED_DB_VERSION
} = require('../../../../workers/loc.api/sync/schema')
const {
  getMigrationFileMetadata
} = require('../../../../workers/loc.api/di/factories/helpers')

const migrationFolderPath = path.join(
  __dirname,
  '../../../../workers/loc.api/sync/dao/db-migrations/sqlite-migrations'
)
const trashFolderPath = path.join(
  migrationFolderPath,
  'trash'
)

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
      .positional('wipe', {
        describe: 'Should trash folder migration files be wiped',
        type: 'boolean',
        default: false,
        alias: 'w'
      })
  },

  handler: (argv) => {
    const shouldBeRemoved = argv.totally
    const shouldBeRecovered = argv.recover
    const shouldBeWiped = argv.wipe

    if (
      shouldBeRecovered ||
      shouldBeWiped
    ) {
      const tempMigrationFileDirents = fs.readdirSync(
        trashFolderPath,
        { withFileTypes: true }
      )
      const tempMigrationFileMetadata = getMigrationFileMetadata(
        tempMigrationFileDirents
      )
      const fileNamesStr = _getFileNamesStr(
        tempMigrationFileMetadata
      )

      for (const metadata of tempMigrationFileMetadata) {
        const filePaths = path.join(trashFolderPath, metadata.name)

        if (shouldBeWiped) {
          fs.rmSync(filePaths, { maxRetries: 10, recursive: true })

          continue
        }

        fs.renameSync(
          filePaths,
          path.join(migrationFolderPath, metadata.name)
        )
      }

      const actionVerb = shouldBeWiped
        ? 'Wiped'
        : 'Recovered'
      const coloredFileNamesStr = shouldBeWiped
        ? fileNamesStr.red
        : fileNamesStr.yellow

      console.log(`${actionVerb} trash folder migration files:`.blue)
      console.log(coloredFileNamesStr)

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
    const migrationFileMetadata = getMigrationFileMetadata(
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

    const fileNamesStr = _getFileNamesStr(removingFileNames)

    if (shouldBeRemoved) {
      for (const filePaths of removingFilePaths) {
        fs.rmSync(filePaths, { maxRetries: 10, recursive: true })
      }

      console.log('Removed redundant migration files:'.blue)
      console.log(fileNamesStr.red)

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
    console.log(fileNamesStr.yellow)
  }
}
