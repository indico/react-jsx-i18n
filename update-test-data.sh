#!/bin/sh
set -ex
npm run build >/dev/null
node ./tools/cli.js extract test-data/example.jsx > test-data/example.pot
pybabel update -i test-data/example.pot -l de_DE -o test-data/de_DE.po
rm test-data/example.pot
node ./tools/cli.js compile --domain messages-test --pretty test-data/de_DE.po > test-data/de_DE.json
