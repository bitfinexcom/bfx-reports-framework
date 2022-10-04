'use strict'

module.exports = (orders) => {
  return orders.map((item) => {
    const propName = item[0]
    const order = item[1]

    return [
      propName,
      order > 0 ? -1 : 1
    ]
  })
}
