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

module.exports = {
  freezeAndSealObjectDeeply
}
