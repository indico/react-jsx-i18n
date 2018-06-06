#!/usr/bin/env node

import * as babel from '@babel/core';
import gettextParser from 'gettext-parser';
import moment from 'moment-timezone';
import {mergeEntries} from 'babel-plugin-extract-text/src/builders';
import makeI18nPlugin from './extract-plugin';


const extractFromFiles = (files, headers = undefined, highlightErrors = true) => {
    const errors = [];
    const {i18nPlugin, entries} = makeI18nPlugin();

    files.forEach((file) => {
        try {
            babel.transformFileSync(file, {
                highlightCode: highlightErrors,
                code: false,
                presets: ['@babel/react'],
                plugins: [i18nPlugin],
                parserOpts: {
                    strictMode: false
                }
            });
        } catch (exc) {
            // babel errors already contain the file name
            errors.push(exc.message.replace(process.cwd() + '/', ''));
        }
    });

    if (errors.length) {
        return {errors};
    }

    const data = mergeEntries({}, entries);
    data.headers = headers || {
        'POT-Creation-Date': moment().format('YYYY-MM-YY HH:mmZZ'),
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Transfer-Encoding': '8bit',
        'MIME-Version': '1.0',
        'Generated-By': 'react-jsx-i18n-extract'
    };

    return {pot: gettextParser.po.compile(data).toString()};
};


export default extractFromFiles;
