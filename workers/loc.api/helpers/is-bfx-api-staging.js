'use strict'

const pattern = /(staging)|(test)/i

module.exports = (restUrl) => {
  return !!(
    restUrl &&
    typeof restUrl === 'string' &&
    pattern.test(restUrl)
  )
}
