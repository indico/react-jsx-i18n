#!/usr/bin/env node

import * as babel from '@babel/core';
import gettextParser from 'gettext-parser';
import moment from 'moment-timezone';
import makeI18nPlugin from './extract-plugin';

const extractFromFiles = (files, cfg, headers = undefined, highlightErrors = true) => {
  const errors = [];
  const {i18nPlugin, entries} = makeI18nPlugin(cfg);

  files.forEach(file => {
    try {
      babel.transformFileSync(file, {
        highlightCode: highlightErrors,
        code: false,
        presets: ['@babel/react'],
        plugins: [i18nPlugin],
        parserOpts: {
          strictMode: false,
        },
      });
    } catch (exc) {
      // babel errors already contain the file name
      errors.push(exc.message.replace(process.cwd() + '/', ''));
    }
  });

  if (errors.length) {
    return {errors};
  }

  const data = mergeEntries(entries, headers);
  return {pot: gettextParser.po.compile(data).toString()};
};

export default extractFromFiles;

function mergeEntries(entries, headers) {
  const data = {
    charset: 'UTF-8',
    headers: headers || {
      'POT-Creation-Date': moment().format('YYYY-MM-YY HH:mmZZ'),
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Transfer-Encoding': '8bit',
      'MIME-Version': '1.0',
      'Generated-By': 'react-jsx-i18n-extract',
    },
    translations: {},
  };

  entries.forEach(entry => {
    const {msgid, msgid_plural: msgidPlural, msgctxt, extracted, reference} = entry;
    const context = entry.msgctxt || '';

    if (!data.translations[context]) {
      data.translations[context] = {};
    }

    let existingEntry = data.translations[context][msgid];
    if (!existingEntry) {
      existingEntry = data.translations[context][msgid] = {};
    }

    const existingPlural = existingEntry.msgid_plural;
    const existingTranslation = existingEntry.msgstr;
    const existingExtracted = existingEntry.comments?.extracted;
    const existingReference = existingEntry.comments?.reference;

    data.translations[context][msgid] = {
      msgid,
      msgctxt,
      msgstr: mergeTranslation(existingTranslation, msgidPlural ? ['', ''] : ['']),
      msgid_plural: existingPlural || msgidPlural,
      comments: {
        reference: mergeReference(existingReference, reference),
        extracted: mergeExtracted(existingExtracted, extracted),
      },
    };
  });

  return data;
}

function mergeReference(existingReference, newReference) {
  if (existingReference) {
    if (existingReference.includes(newReference)) {
      return existingReference;
    }

    return `${existingReference}\n${newReference}`;
  }

  return newReference;
}

function mergeExtracted(existingExtracted, extracted) {
  return mergeReference(existingExtracted, extracted);
}

function mergeTranslation(existingTranslation, newTranslation) {
  if (existingTranslation && existingTranslation.length === 2) {
    return existingTranslation;
  }
  return newTranslation;
}
