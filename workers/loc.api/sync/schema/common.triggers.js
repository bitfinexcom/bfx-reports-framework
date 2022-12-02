'use strict'

const TABLES_NAMES = require('./tables-names')

/*
 * NOTE: For this triggers there is required
 * `createdAt` and `updatedAt` and `_id` DB fields
 */
const CREATE_UPDATE_MTS_TRIGGERS = [
  `insert_#{tableName}_createdAt_and_updatedAt
    AFTER INSERT ON #{tableName}
    FOR EACH ROW
    BEGIN
      UPDATE #{tableName}
        SET createdAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT),
          updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)
        WHERE _id = NEW._id;
    END`,
  `update_#{tableName}_updatedAt
    AFTER UPDATE ON #{tableName}
    FOR EACH ROW
    BEGIN
      UPDATE #{tableName}
        SET updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)
        WHERE _id = NEW._id;
    END`
]
const DELETE_SUB_USERS_TRIGGER = `\
delete_#{tableName}_subUsers_from_${TABLES_NAMES.USERS}
  AFTER DELETE ON #{tableName}
  FOR EACH ROW
  BEGIN
    DELETE FROM ${TABLES_NAMES.USERS}
      WHERE _id = OLD.subUserId;
  END`

module.exports = {
  CREATE_UPDATE_MTS_TRIGGERS,
  DELETE_SUB_USERS_TRIGGER
}
