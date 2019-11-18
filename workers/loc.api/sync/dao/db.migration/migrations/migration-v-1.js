'use strinc'

const BaseMigration = require('./migration')

class Migration extends BaseMigration {
  /**
   * TODO:
   * @override
   */
  launch () {
    console.log('[launch-v-1-migration]'.bgBlue)
  }
}

module.exports = Migration
