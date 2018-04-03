#!/usr/bin/env node

import * as babel from '@babel/core';
import gettextParser from 'gettext-parser';
import moment from 'moment';
import {mergeEntries} from 'babel-plugin-extract-text/src/builders';
import makeI18nPlugin from './extract-plugin';


const extractFromFiles = (files, headers = undefined) => {
    const {i18nPlugin, entries} = makeI18nPlugin();

    files.forEach((file) => {
        babel.transformFileSync(file, {
            presets: ['@babel/react'],
            plugins: [i18nPlugin],
        });
    });

    const data = mergeEntries({}, entries);
    data.headers = headers || {
        'POT-Creation-Date': moment().format('YYYY-MM-YY hh:mmZZ'),
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Transfer-Encoding': '8bit',
        'MIME-Version': '1.0',
        'Generated-By': 'react-jsx-i18n-extract'
    };

    return gettextParser.po.compile(data);
};


export default extractFromFiles;
