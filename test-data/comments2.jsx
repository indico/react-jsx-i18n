/* eslint-disable babel/quotes, react/prop-types, react/jsx-curly-brace-presence */

import {makeComponents} from '../src/client';
const {Translate, PluralTranslate} = makeComponents();

// Keep this call on the same line as the corresponding call in comments1.jsx
// This tests that the comments do not get mixed up when babel loads another file
Translate.string('baz');
// Same for this call
PluralTranslate.string('baz', 'bazs', 42);
