'use strict'

module.exports = (array) => {
  return {
    [Symbol.iterator] () {
      return {
        index: array.length,
        next () {
          this.index -= 1

          return {
            done: this.index < 0,
            value: array[this.index]
          }
        }
      }
    }
  }
}
