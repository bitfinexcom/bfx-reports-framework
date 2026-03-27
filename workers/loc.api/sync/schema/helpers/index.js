'use strict'

const freezeAndSealObjectDeeply = (...args) => {
  for (const object of args) {
    if (
      !object ||
      typeof object !== 'object'
    ) {
      return
    }

    Object.freeze(object)
    Object.seal(object)

    for (const value of Object.values(object)) {
      freezeAndSealObjectDeeply(value)
    }
  }
}

const cloneDeepWithoutPropInheritance = (obj) => {
  if (obj instanceof Function) {
    return {}
  }
  if (
    !obj ||
    typeof obj !== 'object'
  ) {
    return obj
  }

  return JSON.parse(JSON.stringify(obj))
}

module.exports = {
  freezeAndSealObjectDeeply,
  cloneDeepWithoutPropInheritance
}
