#!/usr/bin/env node

import extractFromFiles from '../extract';


process.stdout.write(extractFromFiles(process.argv.slice(2)) + '\n');

