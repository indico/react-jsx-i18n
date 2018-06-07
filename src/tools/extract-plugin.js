import {relative} from 'path';
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


const getParamValue = (path, name) => {
    const childElement = path.node.openingElement;
    const matches = childElement.attributes.filter(attr => attr.name.name === name);
    return matches.length ? matches[0].value.value : undefined;
};


const hasParam = (path, name) => {
    const childElement = path.node.openingElement;
    const matches = childElement.attributes.filter(attr => attr.name.name === name);
    return !!matches.length;
};


const processParam = (path) => {
    const paramName = getParamValue(path, 'name');
    if (!paramName) {
        throw path.buildCodeFrameError('Param has no name');
    }
    const children = path.get('children');
    if (children.length === 0) {
        if (!hasParam(path, 'value')) {
            throw path.buildCodeFrameError('Param has no value nor children');
        }
        return `{${paramName}}`;
    } else if (children.length !== 1) {
        throw children[1].buildCodeFrameError(`Param has too many children (${children.length}), expected max. 1`);
    }
    const childPath = children[0];
    if (childPath.type !== 'JSXText') {
        throw childPath.buildCodeFrameError(`Unexpected Param child node: ${childPath.type}`);
    }
    const body = processText(childPath);
    return `{${paramName}}${body}{/${paramName}}`;
};


const processExpression = (path, expression, types, skipNonString = false) => {
    if (types.isStringLiteral(expression)) {
        return expression.value;
    } else if (types.isBinaryExpression(expression)) {
        if (expression.operator !== '+') {
            throw path.buildCodeFrameError(
                `Expected '+' operator in binary expression; found '${expression.operator}' instead`
            );
        }
        return processExpression(path, expression.left, types) + processExpression(path, expression.right, types);
    } else if (skipNonString) {
        return;
    }
    throw path.buildCodeFrameError(
        `Expressions may only contain a string literal or a concatenation of them; found ${expression.type} instead`
    );
};


const processTranslatableElement = (path, types) => {
    const elementName = path.node.openingElement.name.name;
    const stringParts = path.get('children').map((childPath) => {
        if (childPath.type === 'JSXText') {
            return processText(childPath);
        } else if (childPath.type === 'JSXExpressionContainer') {
            return processExpression(childPath, childPath.node.expression, types);
        } else if (childPath.type === 'JSXElement') {
            const childElement = childPath.node.openingElement;
            if (childElement.name.name !== 'Param') {
                throw childPath.buildCodeFrameError(`Unexpected ${elementName} child tag: ${childElement.name.name}`);
            }
            return processParam(childPath);
        } else {
            throw childPath.buildCodeFrameError(`Unexpected ${elementName} child node: ${childPath.type}`);
        }
    });
    return collapseWhitespace(stringParts.join('')).trim();
};


const getLocation = (path, state) => {
    const filename = relative(process.cwd(), state.file.opts.filename);
    return `${filename}:${path.node.loc.start.line}`;
};


const getContext = (path) => {
    const element = path.node.openingElement;
    const contextAttr = element.attributes.filter((attr) => attr.name.name === 'context')[0];
    return contextAttr ? contextAttr.value.value : undefined;
};


const processTranslate = (path, state, types) => {
    const translatableString = processTranslatableElement(path, types);
    return {
        msgid: translatableString,
        msgctxt: getContext(path),
        reference: getLocation(path, state),
    };
};


const processTranslateString = (path, state, funcName, types) => {
    const args = path.node.arguments;
    if (args.length === 0) {
        throw path.buildCodeFrameError('Translate.string() called with no arguments');
    }
    const msgid = processExpression(path, args[0], types);
    const msgctxt = args[1] ? processExpression(path, args[1], types, true) : undefined;
    return {
        msgid,
        msgctxt,
        reference: getLocation(path, state),
    };
};


const processPluralTranslate = (path, state, types) => {
    let singularPath, pluralPath;
    path.get('children').filter((x) => x.node.type === 'JSXElement').forEach((childPath) => {
        const element = childPath.node.openingElement;
        const elementName = element.name.name;
        if (elementName === 'Singular') {
            if (singularPath) {
                throw childPath.buildCodeFrameError('More than one Singular tag found');
            }
            singularPath = childPath;
        } else if (elementName === 'Plural') {
            if (pluralPath) {
                throw childPath.buildCodeFrameError('More than one Plural tag found');
            }
            pluralPath = childPath;
        } else {
            throw childPath.buildCodeFrameError(`Unexpected PluralTranslate child tag: ${elementName}`);
        }
    });
    if (!singularPath) {
        throw path.buildCodeFrameError('No Singular tag found');
    }
    if (!pluralPath) {
        throw path.buildCodeFrameError('No Plural tag found');
    }
    return {
        msgid: processTranslatableElement(singularPath, types),
        msgid_plural: processTranslatableElement(pluralPath, types),
        msgctxt: getContext(path),
        reference: getLocation(path, state),
    };
};


const processPluralTranslateString = (path, state, funcName, types) => {
    const args = path.node.arguments;
    if (args.length < 2) {
        throw path.buildCodeFrameError('PluralTranslate.string() called with less than 2 arguments');
    }
    const msgid = processExpression(path, args[0], types);
    const msgid_plural = processExpression(path, args[1], types);  // eslint-disable-line camelcase
    const msgctxt = args[3] ? processExpression(path, args[3], types) : undefined;
    return {
        msgid,
        msgid_plural,
        msgctxt,
        reference: getLocation(path, state),
    };
};


const makeI18nPlugin = () => {
    const entries = [];
    const i18nPlugin = ({types}) => {
        return {
            visitor: {
                JSXElement(path, state) {
                    const elementName = path.node.openingElement.name.name;
                    if (elementName === 'Translate') {
                        entries.push(processTranslate(path, state, types));
                    } else if (elementName === 'PluralTranslate') {
                        entries.push(processPluralTranslate(path, state, types));
                    }
                },
                CallExpression(path, state) {
                    const callee = path.node.callee;
                    if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier') {
                        return;
                    }
                    const elementName = callee.object.name;
                    if (elementName !== 'Translate' && elementName !== 'PluralTranslate') {
                        return;
                    }
                    const property = callee.property;
                    const funcName = callee.computed ? property.value : property.name;
                    if (callee.computed && property.type !== 'StringLiteral') {
                        return;
                    } else if (!callee.computed && property.type !== 'Identifier') {
                        return;
                    } else if (funcName !== 'string') {
                        return;
                    }
                    // we got a proper call of one of our translation functions
                    const qualifiedFuncName = `${elementName}.${funcName}`;
                    if (elementName === 'Translate') {
                        entries.push(processTranslateString(path, state, qualifiedFuncName, types));
                    } else if (elementName === 'PluralTranslate') {
                        entries.push(processPluralTranslateString(path, state, qualifiedFuncName, types));
                    }
                }
            }
        };
    };

    return {i18nPlugin, entries};
};

export default makeI18nPlugin;
