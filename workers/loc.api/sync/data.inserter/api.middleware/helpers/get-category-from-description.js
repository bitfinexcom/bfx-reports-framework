'use strict'

const _startsWith = (d, pattern) => {
  return d.toLowerCase().startsWith(pattern)
}

const _includes = (d, pattern) => {
  return d.toLowerCase().includes(pattern)
}

const _test = (d, pattern) => {
  return pattern.test(d.toLowerCase())
}

const _schema = [
  {
    tester: (d) => (
      _startsWith(d, 'exchange')
    ),
    category: 5
  },
  {
    tester: (d) => (
      _startsWith(d, 'position modified') ||
      _startsWith(d, 'position closed') ||
      _test(d, /position #[0-9]* close/) ||
      _test(d, /position #[0-9]* liquidate/) ||
      _test(d, /position pl @\s?[0-9]*\.?[0-9]* settlement \(trade\) on wallet margin/)
    ),
    category: 22
  },
  {
    tester: (d) => (
      _startsWith(d, 'position claim') ||
      _test(d, /position #[0-9]* claim/)
    ),
    category: 23
  },
  {
    tester: (d) => (
      _test(d, /position #[0-9]* transfer/)
    ),
    category: 25
  },
  {
    tester: (d) => (
      _test(d, /position #[0-9]* swap/)
    ),
    category: 26
  },
  {
    tester: (d) => (
      _startsWith(d, 'position funding cost') ||
      _startsWith(d, 'interest charge') ||
      _test(d, /position #[0-9]* funding cost/)
    ),
    category: 27
  },
  {
    tester: (d) => (
      _startsWith(d, 'margin funding payment') ||
      _startsWith(d, 'swap payment') ||
      _startsWith(d, 'interest payment')
    ),
    category: 28
  },
  {
    tester: (d) => (
      _startsWith(d, 'funding event')
    ),
    category: 29
  },
  {
    tester: (d) => (
      _includes(d, 'settlement')
    ),
    category: 31
  },
  {
    tester: (d) => (
      _startsWith(d, 'transfer')
    ),
    category: 51
  },
  {
    tester: (d) => (
      _startsWith(d, 'deposit (') ||
      _startsWith(d, 'deposit on wallet')
    ),
    category: 101
  },
  {
    tester: (d) => (
      _includes(d, ' withdrawal #')
    ),
    category: 104
  },
  {
    tester: (d) => (
      _startsWith(d, 'canceled withdrawal')
    ),
    category: 105
  },
  {
    tester: (d) => (
      _startsWith(d, 'trading fee')
    ),
    category: 201
  },
  {
    tester: (d) => (
      _includes(d, 'trading rebate')
    ),
    category: 202
  },
  {
    tester: (d) => (
      _startsWith(d, 'hidden order fee')
    ),
    category: 204
  },
  {
    tester: (d) => (
      _startsWith(d, 'otc trade fee')
    ),
    category: 207
  },
  {
    tester: (d) => (
      _startsWith(d, 'swap fee')
    ),
    category: 222
  },
  {
    tester: (d) => (
      _startsWith(d, 'claiming fee')
    ),
    category: 224
  },
  {
    tester: (d) => (
      _includes(d, 'margin funding charge')
    ),
    category: 226
  },
  {
    tester: (d) => (
      _includes(d, 'margin funding fee')
    ),
    category: 228
  },
  {
    tester: (d) => (
      _startsWith(d, 'earned fee') ||
      _startsWith(d, 'affiliate rebate')
    ),
    category: 241
  },
  {
    tester: (d) => (
      _startsWith(d, 'ETHFX loyalty fee')
    ),
    category: 243
  },
  {
    tester: (d) => (
      _includes(d, 'deposit fee')
    ),
    category: 251
  },
  {
    tester: (d) => (
      _includes(d, 'withdrawal fee')
    ),
    category: 254
  },
  {
    tester: (d) => (
      _includes(d, 'withdrawal express fee')
    ),
    category: 255
  },
  {
    tester: (d) => (
      _startsWith(d, 'miner fee')
    ),
    category: 258
  },
  {
    tester: (d) => (
      _startsWith(d, 'staking reward')
    ),
    category: 262
  },
  {
    tester: (d) => (
      _startsWith(d, 'adjustment')
    ),
    category: 401
  },
  {
    tester: (d) => (
      _startsWith(d, 'expense')
    ),
    category: 501
  },
  {
    tester: (d) => (
      _startsWith(d, 'currency conversion') ||
      _startsWith(d, 'computation fee')
    ),
    category: 905
  },
  {
    tester: (d) => (
      _startsWith(d, 'monthly profit payment')
    ),
    category: 907
  },
  {
    tester: (d) => (
      _startsWith(d, 'losses')
    ),
    category: 911
  }
]

module.exports = (description) => {
  const d = description.toLowerCase()

  for (const { tester, category } of _schema) {
    if (tester(d)) {
      return category
    }
  }

  return null
}
