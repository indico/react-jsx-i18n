import {relative} from 'path';
import cleanJSXElementLiteralChild from '@babel/types/lib/utils/react/cleanJSXElementLiteralChild';

const collapseWhitespace = (string, trim = true) => {
  // for translated strings we never want consecutive or surrounding whitespace
  if (!string) {
    return string;
  }
  string = string.replace(/\s+/g, ' ');
  if (trim) {
    string = string.trim();
  }
  return string;
};

const processText = path => {
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

const processParam = (path, types) => {
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
  }
  // eslint-disable-next-line no-use-before-define
  const body = processElement(path, types);
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
    return (
      processExpression(path, expression.left, types) +
      processExpression(path, expression.right, types)
    );
  } else if (skipNonString) {
    return;
  }
  throw path.buildCodeFrameError(
    `Expressions may only contain a string literal or a concatenation of them; found ${expression.type} instead`
  );
};

const processElement = (path, types, allowParam = false) => {
  const elementName = path.node.openingElement.name.name;
  const stringParts = path.get('children').map(childPath => {
    if (childPath.type === 'JSXText') {
      return processText(childPath);
    } else if (childPath.type === 'JSXExpressionContainer') {
      return processExpression(childPath, childPath.node.expression, types);
    } else if (childPath.type === 'JSXElement') {
      const childElement = childPath.node.openingElement;
      if (!allowParam || childElement.name.name !== 'Param') {
        throw childPath.buildCodeFrameError(
          `Unexpected ${elementName} child tag: ${childElement.name.name}`
        );
      }
      return processParam(childPath, types);
    } else {
      throw childPath.buildCodeFrameError(
        `Unexpected ${elementName} child node: ${childPath.type}`
      );
    }
  });
  const string = collapseWhitespace(stringParts.join(''), false);
  if (allowParam && string !== string.trim()) {
    throw path.buildCodeFrameError(
      `${elementName} content may not be surrounded by significant whitespace`
    );
  }
  return string;
};

const getLocation = (cfg, path, state) => {
  const filename = relative(cfg.base, state.file.opts.filename);
  if (cfg.addLocation === 'full') {
    return `${filename}:${path.node.loc.start.line}`;
  } else if (cfg.addLocation === 'file') {
    return filename;
  }
};

const getContext = path => {
  const element = path.node.openingElement;
  const contextAttr = element.attributes.filter(attr => attr.name.name === 'context')[0];
  return contextAttr ? contextAttr.value.value : undefined;
};

const getTranslatorComment = path => {
  const element = path.node.openingElement;
  const commentAttr = element.attributes.filter(attr => attr.name.name === 'comment')[0];
  return commentAttr ? commentAttr.value.value : undefined;
};

const processTranslate = (cfg, path, state, types) => {
  const translatableString = processElement(path, types, true);
  return {
    msgid: translatableString,
    msgctxt: getContext(path),
    extracted: getTranslatorComment(path),
    reference: getLocation(cfg, path, state),
  };
};

const processTranslateString = (cfg, path, state, funcName, comment, types) => {
  const args = path.node.arguments;
  if (args.length === 0) {
    throw path.buildCodeFrameError('Translate.string() called with no arguments');
  }
  const msgid = collapseWhitespace(processExpression(path, args[0], types));
  const msgctxt = args[1]
    ? collapseWhitespace(processExpression(path, args[1], types, true))
    : undefined;
  return {
    msgid,
    msgctxt,
    reference: getLocation(cfg, path, state),
    extracted: comment,
  };
};

const processPluralTranslate = (cfg, path, state, types) => {
  let singularPath, pluralPath;
  path
    .get('children')
    .filter(x => x.node.type === 'JSXElement')
    .forEach(childPath => {
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
    msgid: processElement(singularPath, types, true),
    msgid_plural: processElement(pluralPath, types, true),
    msgctxt: getContext(path),
    extracted: getTranslatorComment(path),
    reference: getLocation(cfg, path, state),
  };
};

const processPluralTranslateString = (cfg, path, state, funcName, comment, types) => {
  const args = path.node.arguments;
  if (args.length < 2) {
    throw path.buildCodeFrameError('PluralTranslate.string() called with less than 2 arguments');
  }
  const msgid = collapseWhitespace(processExpression(path, args[0], types));
  // eslint-disable-next-line camelcase
  const msgid_plural = collapseWhitespace(processExpression(path, args[1], types));
  const msgctxt = args[3]
    ? collapseWhitespace(processExpression(path, args[3], types, true))
    : undefined;
  return {
    msgid,
    msgid_plural,
    msgctxt,
    reference: getLocation(cfg, path, state),
    extracted: comment,
  };
};

function getPrecedingComment(line, comments) {
  return comments.find(comment => comment.line === line - 1)?.comment;
}

const makeI18nPlugin = cfg => {
  const entries = [];
  let comments = [];
  const i18nPlugin = ({types}) => {
    return {
      visitor: {
        Program(path) {
          comments = path.container.comments
            .filter(comment => comment.value.trim().startsWith('i18n:'))
            .map(comment => ({
              comment: comment.value.trim(),
              line: comment.loc.start.line,
            }));
        },
        JSXElement(path, state) {
          const elementName = path.node.openingElement.name.name;
          if (elementName === 'Translate') {
            entries.push(processTranslate(cfg, path, state, types));
          } else if (elementName === 'PluralTranslate') {
            entries.push(processPluralTranslate(cfg, path, state, types));
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
          const line = path.node.loc.start.line;
          const comment = getPrecedingComment(line, comments);
          if (elementName === 'Translate') {
            entries.push(
              processTranslateString(cfg, path, state, qualifiedFuncName, comment, types)
            );
          } else if (elementName === 'PluralTranslate') {
            entries.push(
              processPluralTranslateString(cfg, path, state, qualifiedFuncName, comment, types)
            );
          }
        },
      },
    };
  };

  return {i18nPlugin, entries};
};

export default makeI18nPlugin;
