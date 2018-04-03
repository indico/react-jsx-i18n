import * as fs from 'fs';
import gettextParser from 'gettext-parser';


const jsonifyMessage = (message) => {
    if (!/{[a-z]+}/.test(message)) {
        return message;
    }

    const json = ['Fragment', null];
    const parts = message.split(/({\/?[a-z]+})/).filter((part) => !!part);
    for (let i = 0; i < parts.length; i++) {
        const match = parts[i].match(/^{([a-z]+)}$/);
        if (!match) {
            // plain string
            json.push(parts[i]);
            continue;
        }
        const paramName = match[1];
        if (parts[i + 2] === `{/${paramName}}`) {
            // param with a body
            json.push(['Param', {name: paramName}, parts[i + 1]]);
            i += 2;
        } else {
            // param with no body
            json.push(['Param', {name: paramName}]);
        }
    }
    return json;
};


const poToReact = (poFile, domain = 'messages') => {
    const po = gettextParser.po.parse(fs.readFileSync(poFile), 'UTF-8');

    const translations = Object.values(po.translations['']).map((item) => {
        return {[item.msgid]: item.msgstr.map(jsonifyMessage)};
    });

    return {
        [domain]: {
            ...Object.assign(Object.create(null), ...translations),
            '': {
                domain,
                lang: po.headers.language,
                plural_forms: po.headers['plural-forms'],
            }
        }
    };

};

export default poToReact;
