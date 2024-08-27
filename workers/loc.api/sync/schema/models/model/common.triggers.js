'use strict'

const TABLES_NAMES = require('../../tables-names')

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
const CREATE_UPDATE_API_KEYS_TRIGGERS = [
  `insert_#{tableName}_apiKey_and_apiSecret
    BEFORE INSERT ON #{tableName}
    FOR EACH ROW
    BEGIN
      SELECT
        CASE
          WHEN (NEW.authToken IS NULL AND NEW.apiKey IS NULL) OR
            (NEW.apiKey IS NULL AND NEW.apiSecret IS NOT NULL)
          THEN
            RAISE (FAIL,'Invalid apiKey')
          WHEN (NEW.authToken IS NULL AND NEW.apiSecret IS NULL) OR
            (NEW.apiSecret IS NULL AND NEW.apiKey IS NOT NULL)
          THEN
            RAISE (FAIL,'Invalid apiSecret')
        END;
    END`,
  `update_#{tableName}_apiKey_and_apiSecret
    BEFORE UPDATE ON #{tableName}
    FOR EACH ROW
    BEGIN
      SELECT
        CASE
          WHEN (NEW.authToken IS NULL AND NEW.apiKey IS NULL) OR
            (NEW.apiKey IS NULL AND NEW.apiSecret IS NOT NULL)
          THEN
            RAISE (FAIL,'Invalid apiKey')
          WHEN (NEW.authToken IS NULL AND NEW.apiSecret IS NULL) OR
            (NEW.apiSecret IS NULL AND NEW.apiKey IS NOT NULL)
          THEN
            RAISE (FAIL,'Invalid apiSecret')
        END;
    END`
]

module.exports = {
  CREATE_UPDATE_API_KEYS_TRIGGERS,
  CREATE_UPDATE_MTS_TRIGGERS,
  DELETE_SUB_USERS_TRIGGER
}
