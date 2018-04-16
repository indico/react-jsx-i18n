import React from 'react';
import renderer from 'react-test-renderer';

import {makeComponents, Param, Singular, Plural} from '../src/client';
import {jsonifyMessage} from '../src/tools/po2react';
import {TestComponent, testStrings} from '../test-data/example';


const expectJSX = (jsx) => expect(renderer.create(jsx).toJSON());
const expectJSXWrapper = (jsx) => expect(() => renderer.create(jsx).toJSON());
const gettext = expression => jsonifyMessage(`translated-${expression}`);
const ngettext = (sExpression, pExpression, n) => (
    jsonifyMessage(n !== 1 ? `plural-${pExpression}` : `singular-${sExpression}`)
);

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
    expectJSX(<Translate>Fetchez la vache <Param name="number" value={5} /></Translate>).toEqual(
        ['translated-Fetchez la vache ', '5']);
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
    expectJSX(message(2)).toEqual(['plural-This is ', '2', ' vaches']);

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

test('JSX expressions evaluating to static strings work', () => {
    expectJSX(<Translate>This is a {'test'}</Translate>).toBe('translated-This is a test');
    expectJSX(<Translate>This is a {'te' + 'st'}</Translate>).toBe('translated-This is a test');
});

test('Invalid translate children fail', () => {
    expectJSXWrapper(<Translate>5 + 5 = {5 + 5}</Translate>).toThrow(/Unexpected Translate child type/);
    expectJSXWrapper(<Translate><span>test</span></Translate>).toThrow(/must be of type Param/);
    expectJSXWrapper(<Translate><Singular>test</Singular></Translate>).toThrow(/must be of type Param/);
    expectJSXWrapper(
        <Translate>
            <Param name="test" value="foo" />
            <Param name="test" value="foo" />
        </Translate>
    ).toThrow(/found test more than once/);
    expectJSXWrapper(
        <Translate><Param name="test" value="foo">{123}</Param></Translate>
    ).toThrow(/Unexpected Param child type/);
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

    expectJSX(secondElement).toEqual(['translated-Fetchez la ', 'vache', 'test', ' ', '5']);

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

    expectJSX(pluralMessage(1)).toEqual(['singular-fetchez la vache ', '1']);
    expectJSX(pluralMessage(2)).toEqual(['plural-FETCHEZ LES VACHES ', '2']);
});

test('Prop updates are working with translation', () => {
    class MyComponent extends React.Component {
        constructor() {
            super();
            this.state = {name: 'user', count: 0};
        }

        render() {
            const {name, count} = this.state;
            return (
                <div>
                    <Translate>
                        Hello, <Param name="name" value={name} />
                    </Translate>
                    <br />
                    <PluralTranslate count={count}>
                        <Singular>You have a new message.</Singular>
                        <Plural>You have <Param name="count" value={count} /> new messages.</Plural>
                    </PluralTranslate>
                </div>
            );
        }
    }

    const testRenderer = renderer.create(<MyComponent />);
    expect(testRenderer.toJSON()).toMatchSnapshot();
    testRenderer.getInstance().setState({name: 'world'});
    expect(testRenderer.toJSON()).toMatchSnapshot();
    testRenderer.getInstance().setState({name: 'important dude', count: 1});
    expect(testRenderer.toJSON()).toMatchSnapshot();
});

test('Prop updates are working without translation', () => {
    // eslint-disable-next-line no-shadow
    const {Translate, PluralTranslate} = makeComponents(
        (msg) => msg,
        (msg, msgpl, n) => (n === 1 ? msg : msgpl)
    );

    class MyComponent extends React.Component {
        constructor() {
            super();
            this.state = {name: 'user', count: 0};
        }

        render() {
            const {name, count} = this.state;
            return (
                <div>
                    <Translate>
                        Hello, <Param name="name" value={name} />
                    </Translate>
                    <br />
                    <PluralTranslate count={count}>
                        <Singular>You have a new message.</Singular>
                        <Plural>You have <Param name="count" value={count} /> new messages.</Plural>
                    </PluralTranslate>
                </div>
            );
        }
    }

    const testRenderer = renderer.create(<MyComponent />);
    expect(testRenderer.toJSON()).toMatchSnapshot();
    testRenderer.getInstance().setState({name: 'world'});
    expect(testRenderer.toJSON()).toMatchSnapshot();
    testRenderer.getInstance().setState({name: 'important dude', count: 1});
    expect(testRenderer.toJSON()).toMatchSnapshot();
});

test('Example component works properly without translations', () => {
    expectJSX(<TestComponent />).toMatchSnapshot();
});

test('Example component works properly with translations', () => {
    expectJSX(<TestComponent translate />).toMatchSnapshot();
});

test('Example strings work properly without translations', () => {
    expect(testStrings(false)).toMatchSnapshot();
});

test('Example strings work properly with translations', () => {
    expect(testStrings(true)).toMatchSnapshot();
});
