import extractFromFiles from '../src/tools/extract';

const expectExtracted = (file, headers, base, addLocation = 'full') =>
  expect(
    extractFromFiles(
      Array.isArray(file) ? file : [file],
      {base: base || process.cwd(), addLocation},
      headers,
      false
    )
  );

test('Messages are properly extracted', () => {
  expectExtracted('test-data/example.jsx', {Custom: 'Headers'}).toMatchSnapshot();
  expectExtracted('test-data/example.jsx').toMatchSnapshot();
  expectExtracted('test-data/example.jsx', undefined, 'test-data').toMatchSnapshot();
  expectExtracted('test-data/example.jsx', undefined, undefined, 'file').toMatchSnapshot();
  expectExtracted('test-data/example.jsx', undefined, undefined, 'never').toMatchSnapshot();
});

test('Invalid stuff fails', () => {
  expectExtracted('test-data/invalid/invalid-binary-expression.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/invalid-expression.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/param-invalid-child.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/param-too-many-children.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/translate-invalid-child-element.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/translate-invalid-child.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/multiple-singular.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/multiple-plural.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/no-singular.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/no-plural.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/pluraltranslate-invalid-child-element.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/translate-string-no-args.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/pluraltranslate-string-missing-args.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/param-no-name.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/param-no-children-value.jsx').toMatchSnapshot();
  expectExtracted('test-data/invalid/surrounding-whitespace.jsx').toMatchSnapshot();
});

test('Non-string call ignored', () => {
  expectExtracted('test-data/invalid/skipped-strings.jsx').toMatchSnapshot();
});

test('Translator comments are properly extracted', () => {
  // Test with multiple files to ensure the internal state (i.e. translatorComments) is
  // properly reset when the file changes
  expectExtracted(
    ['test-data/comments1.jsx', 'test-data/comments2.jsx'],
    undefined,
    undefined,
    'never'
  ).toMatchSnapshot();
});
