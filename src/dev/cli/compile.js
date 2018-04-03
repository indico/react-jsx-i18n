#!/usr/bin/env node

import poToReact from '../po2react';


process.stdout.write(JSON.stringify(poToReact(process.argv[2])) + '\n');
