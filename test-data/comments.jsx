/* eslint-disable babel/quotes, react/prop-types, react/jsx-curly-brace-presence */

import React from 'react';
import {makeComponents, Singular, Plural, Param} from '../src/client';
const {Translate, PluralTranslate} = makeComponents();

// i18n: foo comment 1
Translate.string('foo');

// i18n: foo comment 2
Translate.string('foo');

/* i18n: multiline
   comment
*/
Translate.string('foo');

// No 'i18n:' prefix, should not be extracted
Translate.string('foo');

// i18n: Space between the comment and the 'Translate' call, this should not be extracted

Translate.string('foo');

// i18n: Both strings
// i18n: should be extracted
Translate.string('bar');

/* i18n: multiple
  multiline comments
*/
/* i18n: are not guaranteed to work
  because you should not be using this anyway
*/
Translate.string('bar');

// i18n: Only the last comment should be extracted
// some other comment
// i18n: translator comment
Translate.string('baz');

export function TestComponent() {
  return (
    <div>
      {/* i18n: Title */}
      <Translate>Hello & World</Translate>
      {/* i18n: multiple */} {/* i18n: translator */}
      {/* i18n: comments */}
      <Translate>foo bar</Translate>
      {/* i18n: rat counter */}
      <PluralTranslate count={42}>
        <Singular>
          You have <Param name="count" value={1} /> rat.
        </Singular>
        <Plural>
          You have <Param name="count" value={2} /> rats.
        </Plural>
      </PluralTranslate>
      {/* i18n: xxx comment */}
      {Translate.string('xxx')}
      {() => {
        // i18n: yyy comment
        return PluralTranslate.string('yyy', 'yyys', 42);
      }}
    </div>
  );
}
