#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import glob from 'glob';
import uniq from 'lodash.uniq';
import yargs from 'yargs';
import extractFromFiles from './extract';
import poToReact from './po2react';


const flattenPaths = (paths, exts) => {
    const files = [];
    paths.forEach((p) => {
        if (!fs.existsSync(p)) {
            console.error(chalk.red.bold(`Invalid path: ${chalk.yellow.bold(p)}`));
            return;
        }
        const stat = fs.lstatSync(p);
        if (stat.isDirectory()) {
            glob.sync(path.join(p, `**/*.*(${exts.join('|')})`), {nodir: true}).forEach((f) => {
                files.push(f);
            });
        } else if (stat.isFile()) {
            files.push(p);
        }
    });
    files.sort();
    return uniq(files);
};


yargs
    .command('extract [opts] <paths...>', 'Extract translatable strings', (y) => {
        y.positional('paths', {
            type: 'string',
            describe: 'files or directories',
        });
        y.option('ext', {
            alias: 'e',
            default: 'js,jsx',
            type: 'string',
            coerce: (val) => val.split(','),
            describe: 'file extensions to consider',
        });
    }, (argv) => {
        const files = flattenPaths(argv.paths, argv.ext);
        const {pot, errors} = extractFromFiles(files);
        if (errors) {
            errors.forEach(console.error.bind(console));
            process.exit(1);
        }
        process.stdout.write(pot + '\n');
    })
    .command('compile <pofile>', 'Compile translated strings', (y) => {
        y.positional('pofile', {
            type: 'string',
            describe: 'po file to compile',
        });
        y.option('domain', {
            alias: 'd',
            default: 'messages',
            type: 'string',
            describe: 'gettext domain to use in the output data',
        });
    }, (argv) => {
        if (!fs.existsSync(argv.pofile)) {
            console.error(chalk.red.bold(`Invalid path: ${chalk.yellow.bold(argv.pofile)}`));
            return;
        }
        const data = poToReact(argv.pofile, argv.domain);
        process.stdout.write(JSON.stringify(data) + '\n');
    })
    .demandCommand()
    .help()
    .argv;
