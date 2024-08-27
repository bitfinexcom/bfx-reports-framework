'use strict'

const Model = require('./model')

module.exports = new Model({
  masterUserId: Model.INTEGER_NOT_NULL,
  subUserId: Model.INTEGER_NOT_NULL,

  [Model.CONSTR_FIELD_NAME]: [
    Model.COMMON_CONSTRAINTS.MASTER_USER_ID_CONSTRAINT,
    Model.COMMON_CONSTRAINTS.SUB_USER_ID_CONSTRAINT
  ],
  [Model.TRIGGER_FIELD_NAME]: Model.COMMON_TRIGGERS
    .DELETE_SUB_USERS_TRIGGER
}, { hasCreateUpdateMtsTriggers: true })
