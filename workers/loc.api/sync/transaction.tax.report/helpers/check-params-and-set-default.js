'use strict'

const strategyList = ['isFIFO', 'isLIFO']

module.exports = (args = {}) => {
  const _args = { ...args }
  const params = { ..._args.params }
  const start = params.start ?? 0
  const end = params.end ?? Date.now()

  const areAllFalse = strategyList
    .every((name) => !params[name])

  if (areAllFalse) {
    params.isLIFO = true
  }

  const isOnlyOneTrue = strategyList
    .filter((name) => params[name])
    .length === 1

  if (!isOnlyOneTrue) {
    // TODO:
    throw new Error('ERR_WRONG_CONDITION_PASSED')
  }

  _args.params = {
    start,
    end,
    ...params
  }

  return _args
}
