'use strict'

const Model = require('./model')

module.exports = new Model({
  collName: Model.VARCHAR_NOT_NULL,
  state: Model.VARCHAR,
  ownerUserId: Model.INTEGER,
  isOwnerScheduler: Model.INTEGER,

  [Model.CONSTR_FIELD_NAME]: Model.COMMON_CONSTRAINTS
    .OWNER_USER_ID_CONSTRAINT
}, { hasCreateUpdateMtsTriggers: true })
