'use strict'

const { orderBy } = require('lodash')

module.exports = (migrationFileDirents) => {
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
