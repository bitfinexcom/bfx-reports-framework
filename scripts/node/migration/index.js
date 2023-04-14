#!/usr/bin/env node

'use strict'

require('colors')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

yargs(hideBin(process.argv))
  .scriptName('migration')
  .usage('Usage: $0 <command> [options]')
  .commandDir('cmds')
  .demandCommand()
  .help('h')
  .alias('h', 'help')
  .parse()
