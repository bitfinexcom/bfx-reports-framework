'use strict'

module.exports = (array) => {
  return {
    [Symbol.iterator] (areEntriesReturned) {
      return {
        index: array.length,
        next () {
          this.index -= 1

          return {
            done: this.index < 0,
            value: areEntriesReturned
              ? [this.index, array[this.index]]
              : array[this.index]
          }
        }
      }
    },
    entries () {
      const iterator = this[Symbol.iterator](true)

      return {
        [Symbol.iterator] () { return iterator }
      }
    }
  }
}
