'use strict'

const _schema = [
  {
    tester: (d) => (
      d.startsWith('exchange')
    ),
    category: 5
  },
  {
    tester: (d) => (
      d.startsWith('position modified') ||
      d.startsWith('position closed') ||
      d.test(/position #[0-9]* close/) ||
      d.test(/position #[0-9]* liquidate/)
    ),
    category: 22
  },
  {
    tester: (d) => (
      d.startsWith('position claim') ||
      d.test(/position #[0-9]* claim/)
    ),
    category: 23
  },
  {
    tester: (d) => (
      d.test(/position #[0-9]* transfer/)
    ),
    category: 25
  },
  {
    tester: (d) => (
      d.test(/position #[0-9]* swap/)
    ),
    category: 26
  },
  {
    tester: (d) => (
      d.startsWith('position funding cost') ||
      d.startsWith('interest charge') ||
      d.test(/position #[0-9]* funding cost/)
    ),
    category: 27
  },
  {
    tester: (d) => (
      d.startsWith('margin funding payment') ||
      d.startsWith('swap payment') ||
      d.startsWith('interest payment')
    ),
    category: 28
  },
  {
    tester: (d) => (
      d.startsWith('settlement')
    ),
    category: 31
  },
  {
    tester: (d) => (
      d.startsWith('transfer')
    ),
    category: 51
  },
  {
    tester: (d) => (
      d.startsWith('deposit (') ||
      d.startsWith('deposit on wallet')
    ),
    category: 101
  },
  {
    tester: (d) => (
      d.includes(' withdrawal #')
    ),
    category: 104
  },
  {
    tester: (d) => (
      d.startsWith('canceled withdrawale')
    ),
    category: 105
  },
  {
    tester: (d) => (
      d.startsWith('canceled withdrawale')
    ),
    category: 105
  },
  {
    tester: (d) => (
      d.startsWith('trading fee')
    ),
    category: 201
  },
  {
    tester: (d) => (
      d.startsWith('hidden order fee')
    ),
    category: 204
  },
  {
    tester: (d) => (
      d.startsWith('otc trade fee')
    ),
    category: 207
  },
  {
    tester: (d) => (
      d.startsWith('swap fee')
    ),
    category: 222
  },
  {
    tester: (d) => (
      d.startsWith('claiming fee')
    ),
    category: 224
  },
  {
    tester: (d) => (
      d.startsWith('margin funding charge')
    ),
    category: 226
  },
  {
    tester: (d) => (
      d.startsWith('earned fee') ||
      d.startsWith('affiliate rebate')
    ),
    category: 241
  },
  {
    tester: (d) => (
      d.startsWith('ETHFX loyalty fee')
    ),
    category: 243
  },
  {
    tester: (d) => (
      d.includes('deposit fee')
    ),
    category: 251
  },
  {
    tester: (d) => (
      d.includes('withdrawal fee')
    ),
    category: 254
  },
  {
    tester: (d) => (
      d.includes('withdrawal express fee')
    ),
    category: 255
  },
  {
    tester: (d) => (
      d.startsWith('miner fee')
    ),
    category: 258
  },
  {
    tester: (d) => (
      d.startsWith('staking reward')
    ),
    category: 262
  },
  {
    tester: (d) => (
      d.startsWith('adjustment')
    ),
    category: 401
  },
  {
    tester: (d) => (
      d.startsWith('expense')
    ),
    category: 501
  },
  {
    tester: (d) => (
      d.startsWith('currency conversion') ||
      d.startsWith('computation fee')
    ),
    category: 905
  },
  {
    tester: (d) => (
      d.startsWith('monthly profit payment')
    ),
    category: 907
  },
  {
    tester: (d) => (
      d.startsWith('losses')
    ),
    category: 911
  }
]

module.exports = (description) => {
  for (const { tester, category } of _schema) {
    if (tester(description)) {
      return category
    }
  }

  return null
}
