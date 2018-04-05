/* global test:false, expect:false */

import React from 'react';
import renderer from 'react-test-renderer';

import {makeComponents, Param, Singular, Plural} from '../src/client';


const expectJSX = (jsx) => expect(renderer.create(jsx).toJSON());
const gettext = expression => expression.split('').reverse().join('');
const ngettext = (sExpression, pExpression, n) => (n > 1 ? pExpression.toUpperCase() : sExpression.toLowerCase());

const {Translate, PluralTranslate} = makeComponents(gettext, ngettext);

test('Basic translation works', () => {
    expectJSX(<Translate>Fetchez la vache</Translate>).toBe('ehcav al zehcteF');
    expectJSX(<Translate>Fetchez la vache <Param name="number" value={5} /></Translate>).toBe('}rebmun{ ehcav al zehcteF');
});

test('Pluralized translation works', () => {
    const message = count => (
        <PluralTranslate count={count}>
            <Singular>
                This is a vache
            </Singular>
            <Plural>
                This is <Param name="count" value={count} /> vaches
            </Plural>
        </PluralTranslate>
    );
    expectJSX(message(1)).toBe('this is a vache');
    expectJSX(message(2)).toBe('THIS IS {COUNT} VACHES');
});
