#!/usr/bin/env node

const { Command } = require('commander');
const runCmd = require('./src/run');
const checksCmd = require('./src/checks');
const channelsCmd = require('./src/channels');

const program = new Command();

program
  .name('notify')
  .description('Monitor endpoints and send email notifications based on conditions')
  .version('1.0.0');

runCmd.register(program);
checksCmd.register(program);
channelsCmd.register(program);

program.parse();
