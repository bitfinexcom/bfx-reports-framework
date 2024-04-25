'use strict'

module.exports = (opts) => {
  const {
    lenght = 10,
    start = Date.UTC(2025, 0, 1),
    end = Date.UTC(2025, 11, 31),
    price = 55_000
  } = opts ?? {}
  const diff = end - start
  const step = diff / (lenght - 1)

  return new Array(lenght)
    .fill(null)
    .map((item, i, arr) => {
      const mts = i < arr.length - 1
        ? Math.trunc(end - step * i)
        : start

      return { mts, price }
    })
}
