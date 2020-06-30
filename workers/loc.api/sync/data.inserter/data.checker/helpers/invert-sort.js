'use strict'

module.exports = (sortArr) => {
  return sortArr.map(item => {
    const _arr = [...item]

    _arr[1] = item[1] > 0 ? -1 : 1

    return _arr
  })
}
