'use strict'

module.exports = (
  args = {},
  apiRes = [],
  props = []
) => {
  const { params } = { ...args }
  const isApiResObject = (
    apiRes &&
    typeof apiRes === 'object' &&
    !Array.isArray(apiRes)
  )
  const incomingRes = (
    isApiResObject &&
    Array.isArray(apiRes.res)
  )
    ? apiRes.res
    : apiRes
  const isEmptyProps = props.every(({ from, to }) => {
    return (
      typeof to !== 'string' ||
      typeof from !== 'string' ||
      typeof params[from] === 'undefined'
    )
  })

  if (
    !Array.isArray(incomingRes) ||
    isEmptyProps
  ) {
    return apiRes
  }

  const res = incomingRes.map((item) => {
    const additionalProps = props.reduce((accum, { from, to }) => {
      if (
        typeof to !== 'string' ||
        typeof from !== 'string' ||
        typeof params[from] === 'undefined'
      ) {
        return accum
      }

      return {
        ...accum,
        [to]: params[from]
      }
    }, {})

    return {
      ...item,
      ...additionalProps
    }
  })

  return isApiResObject
    ? { ...apiRes, res }
    : res
}
