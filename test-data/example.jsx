/* eslint-disable babel/quotes, react/prop-types, react/jsx-curly-brace-presence */

import React from 'react';
import Jed from 'jed';
import {makeComponents, Singular, Plural, Param} from '../src/client';
import german from './de_DE';

let TRANSLATE = false;

const jedEmpty = new Jed({
  locale_data: {
    'messages-test': {
      '': {
        domain: 'messages-test',
        lang: 'en_GB',
      },
    },
  },
  domain: 'messages-test',
});
const jedTranslated = new Jed({
  locale_data: german,
  domain: 'messages-test',
});
const gettext = msg => (TRANSLATE ? jedTranslated.gettext(msg) : jedEmpty.gettext(msg));
const ngettext = (msg, msgpl, n) =>
  TRANSLATE ? jedTranslated.ngettext(msg, msgpl, n) : jedEmpty.ngettext(msg, msgpl, n);
const pgettext = (ctx, msg) =>
  TRANSLATE ? jedTranslated.pgettext(ctx, msg) : jedEmpty.pgettext(ctx, msg);
const npgettext = (ctx, msg, msgpl, n) =>
  TRANSLATE ? jedTranslated.npgettext(ctx, msg, msgpl, n) : jedEmpty.npgettext(ctx, msg, msgpl, n);

const {Translate, PluralTranslate} = makeComponents({gettext, ngettext, pgettext, npgettext});

export const testStrings = translate => {
  TRANSLATE = translate;
  const v1 = Translate.string('"<strong>Rats.</strong>"');
  const v2 = Translate['string']('"<strong>Rats.</strong>"');
  const v3 = Translate.string('foo' + 'bar');
  const v4 = Translate.string('foobar');
  const meow = Translate.string('offspring', 'cat');
  const ugly = Translate.string('You    are ugly!');
  const cat = count => PluralTranslate.string('cat', 'cats', count);
  const bigCat = count => PluralTranslate.string('cat', 'cats', count, 'big');
  const formattedPlural = count =>
    PluralTranslate.string('one {foo}', 'many {foo}', count, {foo: 'bar'});
  const formattedPluralCtx = count =>
    PluralTranslate.string('one {foo}', 'many {foo}', count, 'c', {foo: 'baz'});
  const weird = Translate.string('foo   {weird} bar {hello}{test} xxx', {
    weird: 'stuff',
    hello: 'world',
    test: 123,
  });
  const oneParam = Translate.string('foo: {foo}', {foo: 'bar'});
  const twoParams = Translate.string('foo: {foo}', 'params-test', {foo: 'bar'});
  const mixedCase = Translate.string('mixed: {mixedCase}', {mixedCase: 'bar'});
  /* eslint-disable object-property-newline */
  return {
    v1,
    v2,
    v3,
    v4,
    meow,
    ugly,
    weird,
    oneParam,
    twoParams,
    mixedCase,
    cat1: cat(1),
    cat2: cat(2),
    bigCat1: bigCat(1),
    bigCat2: bigCat(2),
    formattedPlural1: formattedPlural(1),
    formattedPlural2: formattedPlural(2),
    formattedPluralCtx1: formattedPluralCtx(1),
    formattedPluralCtx2: formattedPluralCtx(2),
  };
};

export const TestComponent = ({translate}) => {
  TRANSLATE = translate;
  const link = <a onClick={() => console.log('meow!')} />;
  const name = 'dude';
  const title = Translate.string('"<strong>Rats.</strong>"');
  const rats = count => (
    <PluralTranslate count={count}>
      <Singular>
        You have <Param name="count" value={count} /> rat.
      </Singular>
      <Plural>
        You have <Param name="count" value={count} /> rats.
      </Plural>
    </PluralTranslate>
  );
  return (
    <div>
      <Translate>Hello & World</Translate>
      <br />
      <Translate>
        Hey <Param name="name" value={name} />, you want to{' '}
        <Param name="link" wrapper={link}>
          click me
        </Param>{' '}
        and you know it!
      </Translate>
      <br />
      <Translate>Bye World</Translate>
      <br />
      <Translate>Bye World</Translate>
      <br />
      <Translate>Some &lt;HTML&gt; & entities: &rarr; &amp;</Translate>
      <br />
      <span title={title}>
        <Translate>Hover me</Translate>
      </span>
      <br />
      <Translate>&lt;HTML&gt; is unescaped when extracted</Translate>
      <br />
      {/* prettier-ignore */}
      <Translate>
        xxx foo bar
        <Param name="test" value={1} />
        <Param name="x" value={'2'}> y</Param>{' '}
        moo
      </Translate>
      <hr />
      <Translate>
        You have <Param name="count" value={1} /> rat.
      </Translate>
      <br />
      {rats(0)}
      <br />
      {rats(1)}
      <br />
      {rats(2)}
      <br />
      <Translate>Little cats:</Translate> <Translate context="cat">offspring</Translate>
      <br />
      <Translate>Little dogs:</Translate> <Translate context="dog">offspring</Translate>
      <br />
      <Translate>
        This is an emphasized dynamic value:{' '}
        <Param name="number" wrapper={<em />} value={10 ** 3} />
      </Translate>
      <Translate>
        This is an emphasized translated value:{' '}
        <Param name="tag" wrapper={<em />}>
          hello
        </Param>
      </Translate>
    </div>
  );
};
