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

  it('Order array of objects by name and value props in desc and asc', () => {
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

  it('Order array of objects by name and value props in asc by default', () => {
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

  it('Order array of objects by name prop in desc using dot syntax', () => {
    const mockedArr = [
      { nestedObj: { name: 'aaa' } },
      { nestedObj: { name: 'www' } },
      { nestedObj: { name: 'bbb' } },
      { nestedObj: { name: 'yyy' } }
    ]

    const orderedArr = orderBy(
      mockedArr,
      ['nestedObj.name'],
      ['desc']
    )

    assert.deepStrictEqual(orderedArr, [
      { nestedObj: { name: 'yyy' } },
      { nestedObj: { name: 'www' } },
      { nestedObj: { name: 'bbb' } },
      { nestedObj: { name: 'aaa' } }
    ])
  })

  it('Order array of objects by second item of array in desc using fn', () => {
    const mockedArr = [
      { nestedObj: { arr: [0, 'aaa'] } },
      { nestedObj: { arr: [0, 'www'] } },
      { nestedObj: { arr: [0, 'bbb'] } },
      { nestedObj: { arr: [0, 'yyy'] } }
    ]

    const orderedArr = orderBy(
      mockedArr,
      [(item) => item?.nestedObj?.arr?.[1]],
      ['desc']
    )

    assert.deepStrictEqual(orderedArr, [
      { nestedObj: { arr: [0, 'yyy'] } },
      { nestedObj: { arr: [0, 'www'] } },
      { nestedObj: { arr: [0, 'bbb'] } },
      { nestedObj: { arr: [0, 'aaa'] } }
    ])
  })

  it('Order array of array by index in desc', () => {
    const mockedArr = [
      ['name', 'aaa'],
      ['name', 'www'],
      ['name', 'bbb'],
      ['name', 'yyy']
    ]

    const orderedArr = orderBy(mockedArr, [1], ['desc'])

    assert.deepStrictEqual(orderedArr, [
      ['name', 'yyy'],
      ['name', 'www'],
      ['name', 'bbb'],
      ['name', 'aaa']
    ])
  })

  it('Order array by index in desc', () => {
    const mockedArr = ['aaa', 'www', 'bbb', 'yyy']

    const orderedArr = orderBy(mockedArr, [(item) => item], ['desc'])

    assert.deepStrictEqual(orderedArr, ['yyy', 'www', 'bbb', 'aaa'])
  })

  it('Order iterable object (Set) of objects by name prop in desc', () => {
    const mockedSet = new Set([
      { name: 'aaa' },
      { name: 'www' },
      { name: 'bbb' },
      { name: 'yyy' }
    ])

    const orderedArr = orderBy(mockedSet, ['name'], ['desc'])

    // If iterable object is required, just create it after ordering
    assert.deepStrictEqual(orderedArr, [
      { name: 'yyy' },
      { name: 'www' },
      { name: 'bbb' },
      { name: 'aaa' }
    ])
  })

  it('Order iterable object (Map) of objects by name prop and key in desc', () => {
    const mockedMap = new Map([
      ['key1', { name: 'aaa' }],
      ['key2', { name: 'www' }],
      ['key3', { name: 'bbb' }],
      ['key4', { name: 'yyy' }]
    ])

    const orderedArrByVal = orderBy(
      mockedMap,
      [([key, val]) => val?.name],
      ['desc']
    )
    const orderedArrByKey = orderBy(
      mockedMap,
      [([key, val]) => key],
      ['desc']
    )

    // If iterable object is required, just create it after ordering
    assert.deepStrictEqual(orderedArrByVal, [
      ['key4', { name: 'yyy' }],
      ['key2', { name: 'www' }],
      ['key3', { name: 'bbb' }],
      ['key1', { name: 'aaa' }]
    ])
    assert.deepStrictEqual(orderedArrByKey, [
      ['key4', { name: 'yyy' }],
      ['key3', { name: 'bbb' }],
      ['key2', { name: 'www' }],
      ['key1', { name: 'aaa' }]
    ])
  })

  it('Order array of objects by name prop in desc with equal values', () => {
    const mockedArr = [
      { name: 'aaa' },
      { name: 'www' },
      { name: 'www' },
      { name: 'bbb' },
      { name: 'yyy' },
      { name: 'aaa' }
    ]

    const orderedArr = orderBy(mockedArr, ['name'], ['desc'])

    assert.deepStrictEqual(orderedArr, [
      { name: 'yyy' },
      { name: 'www' },
      { name: 'www' },
      { name: 'bbb' },
      { name: 'aaa' },
      { name: 'aaa' }
    ])
  })

  it('Order array of objects by name prop in desc with null and undefined', () => {
    const mockedArr = [
      { name: undefined },
      { name: 'aaa' },
      { name: null },
      { name: 'www' },
      { name: null },
      { name: undefined },
      { name: null },
      { name: 'bbb' },
      { name: 'yyy' }
    ]

    const orderedArr = orderBy(mockedArr, ['name'], ['desc'])

    assert.deepStrictEqual(orderedArr, [
      { name: 'yyy' },
      { name: 'www' },
      { name: 'bbb' },
      { name: 'aaa' },
      { name: undefined },
      { name: null },
      { name: null },
      { name: undefined },
      { name: null }
    ])
  })

  it('Order array of objects by name prop in asc with null and undefined', () => {
    const mockedArr = [
      { name: undefined },
      { name: 'aaa' },
      { name: null },
      { name: 'www' },
      { name: null },
      { name: undefined },
      { name: null },
      { name: 'bbb' },
      { name: 'yyy' }
    ]

    const orderedArr = orderBy(mockedArr, ['name'], ['asc'])

    assert.deepStrictEqual(orderedArr, [
      { name: 'aaa' },
      { name: 'bbb' },
      { name: 'www' },
      { name: 'yyy' },
      { name: undefined },
      { name: null },
      { name: null },
      { name: undefined },
      { name: null }
    ])
  })

  it('Throw TypeError if non-iterable object is ordered', () => {
    assert.throws(
      () => orderBy(null, ['name'], ['desc']),
      TypeError
    )
  })
})
