'use strict'

const { assert } = require('chai')

const orderBy = require('../order-by')

describe('orderBy util', () => {
  it('Order array of objects by name prop in desc', () => {
    const mockedArr = [
      { name: 'aaa' },
      { name: 'www' },
      { name: 'bbb' },
      { name: 'yyy' }
    ]

    const orderedArr = orderBy(mockedArr, ['name'], ['desc'])

    assert.deepStrictEqual(orderedArr, [
      { name: 'yyy' },
      { name: 'www' },
      { name: 'bbb' },
      { name: 'aaa' }
    ])
  })

  it('Order array of objects by name prop in asc', () => {
    const mockedArr = [
      { name: 'aaa' },
      { name: 'www' },
      { name: 'bbb' },
      { name: 'yyy' }
    ]

    const orderedArr = orderBy(mockedArr, ['name'], ['asc'])

    assert.deepStrictEqual(orderedArr, [
      { name: 'aaa' },
      { name: 'bbb' },
      { name: 'www' },
      { name: 'yyy' }
    ])
  })
})
