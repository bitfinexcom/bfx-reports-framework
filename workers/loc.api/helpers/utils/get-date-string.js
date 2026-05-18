'use strict'

module.exports = (mc) => {
  return new Date(mc).toDateString().split(' ').join('-')
}
