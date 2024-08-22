'use strict'

const freezeAndSealObjectDeeply = (object) => {
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

module.exports = {
  freezeAndSealObjectDeeply
}
