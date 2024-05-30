'use strict'

module.exports = (array) => {
  return {
    [Symbol.iterator] (areEntriesReturned) {
      return {
        index: array.length,
        res: {
          done: false,
          value: undefined
        },
        next () {
          this.index -= 1
          this.res.done = this.index < 0
          this.res.value = areEntriesReturned
            ? [this.index, array[this.index]]
            : array[this.index]

          return this.res
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
