import cleanJSXElementLiteralChild from '@babel/types/lib/utils/react/cleanJSXElementLiteralChild';


const collapseWhitespace = (string) => {
    // for translated strings we never want consecutive whitespace
    return string.replace(/\s+/g, ' ');
};


const processText = (path) => {
    const result = [];
    cleanJSXElementLiteralChild(path.node, result);
    return result.length ? result[0].value : '';
};


const processParam = (path) => {
    const childElement = path.node.openingElement;
    const paramName = childElement.attributes.filter((attr) => (
        attr.name.name === 'name'
    ))[0].value.value;
    const children = path.get('children');
    if (children.length === 0) {
        return `{${paramName}}`;
    } else if (children.length !== 1) {
        throw new Error(`Param has too many children (${children.length}), expected max. 1`);
    }
    const childPath = children[0];
    if (childPath.type !== 'JSXText') {
        throw new Error(`Unexpected Param child node: ${childPath.type}`);
    }
    const body = processText(childPath);
    return `{${paramName}}${body}{/${paramName}}`;
};


const processExpression = (path) => {
    const expression = path.node.expression;
    if (expression.type !== 'StringLiteral') {
        throw new Error(`{...} expression blocks may only contain a string literal; got ${expression.type}`);
    }
    return expression.value;
};


const processTranslatableElement = (path) => {
    const elementName = path.node.openingElement.name.name;
    const stringParts = path.get('children').map((childPath) => {
        if (childPath.type === 'JSXText') {
            return processText(childPath);
        } else if (childPath.type === 'JSXExpressionContainer') {
            return processExpression(childPath);
        } else if (childPath.type === 'JSXElement') {
            const childElement = childPath.node.openingElement;
            if (childElement.name.name !== 'Param') {
                throw new Error(`Unexpected ${elementName} child tag: ${childElement.name.name}`);
            }
            return processParam(childPath);
        } else {
            throw new Error(`Unexpected ${elementName} child node: ${childPath.type}`);
        }
    });
    return collapseWhitespace(stringParts.join('')).trim();
};


const getLocation = (path, state) => {
    return `${state.file.opts.filename}:${path.node.openingElement.loc.start.line}`;
};


const processTranslate = (path, state) => {
    const translatableString = processTranslatableElement(path);
    return {
        msgid: translatableString,
        reference: getLocation(path, state),
    };
};


const processPluralTranslate = (path, state) => {
    let singularPath, pluralPath;
    path.get('children').filter((x) => x.node.type === 'JSXElement').forEach((childPath) => {
        const element = childPath.node.openingElement;
        const elementName = element.name.name;
        if (elementName === 'Singular') {
            if (singularPath) {
                throw new Error('More than one Singular tag found');
            }
            singularPath = childPath;
        } else if (elementName === 'Plural') {
            if (pluralPath) {
                throw new Error('More than one Plural tag found');
            }
            pluralPath = childPath;
        } else {
            throw new Error(`Unexpected PluralTranslate child tag: ${elementName}`);
        }
    });
    if (!singularPath) {
        throw new Error('No Singular tag found');
    }
    if (!pluralPath) {
        throw new Error('No Plural tag found');
    }
    return {
        msgid: processTranslatableElement(singularPath),
        msgid_plural: processTranslatableElement(pluralPath),
        reference: getLocation(path, state),
    };
};


const makeI18nPlugin = () => {
    const entries = [];
    const i18nPlugin = () => {
        return {
            visitor: {
                JSXElement(path, state) {
                    const elementName = path.node.openingElement.name.name;
                    if (elementName === 'Translate') {
                        entries.push(processTranslate(path, state));
                    } else if (elementName === 'PluralTranslate') {
                        entries.push(processPluralTranslate(path, state));
                    }
                },
            }
        };
    };

    return {i18nPlugin, entries};
};

export default makeI18nPlugin;
