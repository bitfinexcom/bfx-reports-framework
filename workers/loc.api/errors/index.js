'use strict'

const {
  BaseError
} = require('bfx-report/workers/loc.api/errors')

class CollSyncPermissionError extends BaseError {
  constructor (message = 'ERR_PERMISSION_DENIED_TO_SYNC_SELECTED_COLL') {
    super(message)
  }
}

class UpdateSyncQueueJobError extends BaseError {
  constructor (id) {
    super(`ERR_CAN_NOT_UPDATE_SYNC_QUEUE_JOB_BY_ID_${id}`)
  }
}

class AsyncProgressHandlerIsNotFnError extends BaseError {
  constructor (message = 'ERR_ASYNC_PROGRESS_HANDLER_IS_NOT_FUNCTION') {
    super(message)
  }
}

class AfterAllInsertsHookIsNotFnError extends BaseError {
  constructor (message = 'ERR_AFTER_ALL_INSERTS_HOOK_IS_NOT_FUNCTION') {
    super(message)
  }
}

class RemoveListElemsError extends BaseError {
  constructor (message = 'ERR_LIST_IS_NOT_ARRAY') {
    super(message)
  }
}

class UpdateStateCollError extends BaseError {
  constructor (name) {
    super(`ERR_CAN_NOT_UPDATE_STATE_OF_${name.toUpperCase()}`)
  }
}

class UpdateSyncProgressError extends BaseError {
  constructor (name) {
    super(`ERR_CAN_NOT_UPDATE_${name.toUpperCase()}`)
  }
}

class ImplementationError extends BaseError {
  constructor (message = 'ERR_NOT_IMPLEMENTED') {
    super(message)
  }
}

class DAOInitializationError extends BaseError {
  constructor (message = 'ERR_DAO_NOT_INITIALIZED') {
    super(message)
  }
}

class ServerAvailabilityError extends BaseError {
  constructor (restUrl) {
    super(`The server ${restUrl} is not available`)
  }
}

class ObjectMappingError extends BaseError {
  constructor (message = 'ERR_MAPPING_AN_OBJECT_BY_THE_SCHEMA') {
    super(message)
  }
}

class DuringSyncMethodAccessError extends BaseError {
  constructor (message = 'ERR_DURING_SYNC_METHOD_IS_NOT_AVAILABLE') {
    super(message)
  }
}

module.exports = {
  BaseError,
  CollSyncPermissionError,
  UpdateSyncQueueJobError,
  AsyncProgressHandlerIsNotFnError,
  AfterAllInsertsHookIsNotFnError,
  RemoveListElemsError,
  UpdateStateCollError,
  UpdateSyncProgressError,
  ImplementationError,
  DAOInitializationError,
  ServerAvailabilityError,
  ObjectMappingError,
  DuringSyncMethodAccessError
}
