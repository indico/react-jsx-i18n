/* global test:false, expect:false */

import React from 'react';
import renderer from 'react-test-renderer';

import {makeComponents, Param, Singular, Plural} from '../src/client';
import {jsonifyMessage} from '../src/tools/po2react';


const expectJSX = (jsx) => expect(renderer.create(jsx).toJSON());
const expectJSXWrapper = (jsx) => expect(() => renderer.create(jsx).toJSON());
const gettext = expression => jsonifyMessage(`translated-${expression}`);
const ngettext = (sExpression, pExpression, n) => jsonifyMessage(n === 0 || n > 1 ? `plural-${pExpression}` : `singular-${sExpression}`);

const {Translate, PluralTranslate} = makeComponents(gettext, ngettext);

// This prevents printing warnings to the console about missing error boundaries
beforeEach(() => {
    jest.spyOn(console, 'error');
    global.console.error.mockImplementation(() => {});
});

afterEach(() => {
    global.console.error.mockRestore();
});


test('Basic translation works', () => {
    expectJSX(<Translate>kajak</Translate>).toBe('translated-kajak');
    expectJSX(<Translate>Fetchez la vache</Translate>).toBe('translated-Fetchez la vache');
    expectJSX(<Translate>Fetchez la vache <Param name="number" value={5} /></Translate>).toEqual(expect.arrayContaining(['translated-Fetchez la vache ', '5']));
    expectJSX(Translate.string('kajak')).toBe('translated-kajak');
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

    expectJSX(message(1)).toBe('singular-This is a vache');
    expectJSX(message(2)).toEqual(expect.arrayContaining(['plural-This is ', '2', ' vaches']));

    const secondMessage = count => (
        <PluralTranslate count={count}>
            <Singular>
                fetchez la vache
            </Singular>
            <Plural>
                FETCHEZ LES VACHES
            </Plural>
        </PluralTranslate>
    );

    expectJSX(secondMessage(1)).toBe('singular-fetchez la vache');
    expectJSX(secondMessage(2)).toBe('plural-FETCHEZ LES VACHES');
    expectJSX(PluralTranslate.string('Fetchez la Vache', 'Fetchez les vaches', 1)).toBe('singular-Fetchez la Vache');
    expectJSX(PluralTranslate.string('Fetchez la Vache', 'Fetchez les vaches', 2)).toBe('plural-Fetchez les vaches');
});

test('JSX expressions work', () => {
    expectJSX(<Translate>This is a {'test'}</Translate>).toBe('translated-This is a test');
    expectJSXWrapper(<Translate>5 + 5 = {5 + 5}</Translate>).toThrow();
});

test('Translate component can only contain elements of specific type', () => {
    expectJSXWrapper(<Translate>Test <Translate>test</Translate></Translate>).toThrow();
    expectJSXWrapper(<Translate>My name is <Param name="name" value="Michał" /> <Param name="name" value="Michał" /></Translate>).toThrow();
});

test('PluralTranslate component can only contain elements of specific type', () => {
    const element = (
        <PluralTranslate count={5}>
            {'That is a test'}
        </PluralTranslate>
    );

    expectJSXWrapper(element).toThrow();
});

test('Whitespaces are handled correctly', () => {
    const element = (
        <Translate>
            Fetchez   la    vache


            Fetchez la vache
        </Translate>
    );

    expectJSX(element).toBe('translated-Fetchez la vache Fetchez la vache');

    const secondElement = (
        <Translate>
            Fetchez la     <Param name="vache" value="vache" />
            <Param name="random" value="test" />{' '}
            <Param name="count" value={5} />
        </Translate>
    );

    expectJSX(secondElement).toEqual(expect.arrayContaining(['translated-Fetchez la ', 'vache', 'test', ' ', '5']));

    const pluralMessage = count => (
        <PluralTranslate count={count}>
            <Singular>
                fetchez la vache <Param name="number" value={count} />
            </Singular>
            <Plural>
                FETCHEZ LES VACHES <Param name="number" value={count} />
            </Plural>
        </PluralTranslate>
    );

    expectJSX(pluralMessage(1)).toEqual(expect.arrayContaining(['singular-fetchez la vache ', '1']));
    expectJSX(pluralMessage(2)).toEqual(expect.arrayContaining(['plural-FETCHEZ LES VACHES ', '2']));
});
