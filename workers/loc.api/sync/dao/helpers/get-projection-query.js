'use strict'

const _getProjArr = (model) => {
  if (Array.isArray(model)) {
    return model
  }
  if (
    model &&
    typeof model === 'object'
  ) {
    return Object.keys(model)
  }

  return []
}

const _exclude = (projArr, exclude) => {
  if (!Array.isArray(exclude)) {
    return projArr
  }

  return projArr.filter(field => (
    exclude.every(item => item !== field)
  ))
}

const _filterPriv = (projArr, isExcludePrivate) => {
  if (!isExcludePrivate) {
    return projArr
  }

  return projArr.filter(field => !/^_.*/.test(field))
}

module.exports = (
  model,
  exclude = [],
  isExcludePrivate
) => {
  const projArr = _getProjArr(model)
  const filteredProj = _exclude(projArr, exclude)
  const proj = _filterPriv(filteredProj, isExcludePrivate)

  if (proj.length === 0) {
    return '*'
  }

  return proj.join(', ')
}
