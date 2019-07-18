'use strict'

const delay = (mc = 80000) => {
  return new Promise((resolve) => {
    setTimeout(resolve, mc)
  })
}

module.exports = {
  delay
}
