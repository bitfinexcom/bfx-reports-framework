'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

class SubAccount {
  constructor (
    dao,
    TABLES_NAMES,
    rService
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.rService = rService
  }

  // TODO:
  async createSubAccount (args) {
    const { params } = { ...args }
    const { subAccountApiKeys } = { ...params }

    const masterUser = await this.dao.checkAuthInDb(args)

    if (
      !Array.isArray(subAccountApiKeys) ||
      subAccountApiKeys.length === 0
    ) {
      throw new Error('ERR_') // TODO:
    }

    const apiUsersPromises = subAccountApiKeys.map((auth) => {
      return this.rService._checkAuthInApi({ auth })
    })

    const apiUsers = await Promise.all(apiUsersPromises)

    const usersPromises = apiUsers.map((apiUser, i) => {
      const auth = { ...subAccountApiKeys[i] }
      const data = {
        ...auth,
        ...apiUser
      }

      return this.dao.insertOrUpdateUser(data, { active: false })
    })

    const users = await Promise.all(usersPromises) // TODO:
  }

  // TODO:
  removeSubAccount (args) {
  }
}

decorate(injectable(), SubAccount)
decorate(inject(TYPES.DAO), SubAccount, 0)
decorate(inject(TYPES.TABLES_NAMES), SubAccount, 1)
decorate(inject(TYPES.RService), SubAccount, 1)

module.exports = SubAccount
