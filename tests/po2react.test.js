import poToReact, {jsonifyMessage} from '../src/tools/po2react';


const expectJSON = (msg) => expect(jsonifyMessage(msg));


test('Messages are properly converted to JSON', () => {
    expectJSON('This is a test').toMatchSnapshot();
    expectJSON('This is a {link}test{/link}.').toMatchSnapshot();
    expectJSON('This is {dynamic}.').toMatchSnapshot();
    expectJSON('This is {dynamic} {link}link{/link}.').toMatchSnapshot();
});


test('PO file is properly converted to JSON', () => {
    expect(poToReact('test-data/de_DE.po', 'messages-test')).toMatchSnapshot();
});
