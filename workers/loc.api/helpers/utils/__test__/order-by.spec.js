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

  it('Order array of objects by name and value prop in desc and asc', () => {
    const mockedArr = [
      { name: 'aaa', value: 't' },
      { name: 'www', value: 'b' },
      { name: 'bbb', value: 'f' },
      { name: 'www', value: 'a' },
      { name: 'yyy' }
    ]

    const orderedArr = orderBy(
      mockedArr,
      ['name', 'value'],
      ['desc', 'asc']
    )

    assert.deepStrictEqual(orderedArr, [
      { name: 'yyy' },
      { name: 'www', value: 'a' },
      { name: 'www', value: 'b' },
      { name: 'bbb', value: 'f' },
      { name: 'aaa', value: 't' }
    ])
  })

  it('Order array of objects by name and value prop in asc by default', () => {
    const mockedArr = [
      { name: 'aaa', value: 't' },
      { name: 'www', value: 'b' },
      { name: 'bbb', value: 'f' },
      { name: 'www', value: 'a' },
      { name: 'yyy' }
    ]

    const orderedArr = orderBy(
      mockedArr,
      ['name', 'value']
    )

    assert.deepStrictEqual(orderedArr, [
      { name: 'aaa', value: 't' },
      { name: 'bbb', value: 'f' },
      { name: 'www', value: 'a' },
      { name: 'www', value: 'b' },
      { name: 'yyy' }
    ])
  })
})
