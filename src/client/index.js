import React, {useMemo} from 'react';
import PropTypes from 'prop-types';

export function Param({wrapper, value, children}) {
  return wrapper ? React.cloneElement(wrapper, {}, value !== undefined ? value : children) : value;
}

Param.propTypes = {
  // eslint-disable-next-line react/no-unused-prop-types
  name: PropTypes.string.isRequired,
  value: PropTypes.any,
  wrapper: PropTypes.element,
  children: PropTypes.string,
};

Param.defaultProps = {
  value: undefined,
  wrapper: undefined,
  children: undefined,
};

const collapseWhitespace = string => {
  // for translated strings we never want consecutive or surrounding whitespace
  return string.replace(/\s+/g, ' ').trim();
};

const getTranslatableString = children => {
  const usedParams = new Set();
  const items = React.Children.map(children, child => {
    if (!React.isValidElement(child)) {
      // plain value, nothing to change here
      if (typeof child !== 'string') {
        throw new Error(`Unexpected Translate child type: ${typeof child}`);
      }
      return child;
    } else if (child.type !== Param) {
      throw new Error(`Translate child components must be of type Param; got ${child.type.name}`);
    } else {
      const {name: paramName, value: paramValue} = child.props;
      let paramContent = child.props.children;
      if (usedParams.has(paramName)) {
        throw new Error(`Translate params must be unique; found ${paramName} more than once`);
      } else if (Array.isArray(paramContent)) {
        paramContent = paramContent.join('');
      } else if (paramContent !== undefined && typeof paramContent !== 'string') {
        throw new Error(`Unexpected Param child type: ${typeof paramContent}`);
      } else if (paramContent === undefined && paramValue === undefined) {
        throw new Error(`Param has no value nor children`);
      }
      usedParams.add(paramName);
      return paramContent === undefined
        ? `{${paramName}}`
        : `{${paramName}}${paramContent}{/${paramName}}`;
    }
  });
  return collapseWhitespace(items.join(''));
};

const jsonToReact = (values, component, props, ...children) => {
  /* eslint-disable react/prop-types */
  component = {Fragment: React.Fragment, Param}[component];
  if (component === Param) {
    // inject the value from the original Param in the translated string's Param
    props = {...props, ...values[props.name]};
  }
  return React.createElement(
    component,
    props,
    ...children.map(child => {
      return typeof child === 'string' ? child : jsonToReact(values, ...child);
    })
  );
};

const renderTranslation = (translation, values) => {
  if (typeof translation === 'string') {
    return translation;
  } else {
    return jsonToReact(values, ...translation);
  }
};

const jsonToText = (values, component, props, ...children) => {
  if (component === 'Param') {
    if (children.length) {
      throw new Error('Placeholders with content are not supported in string()');
    } else {
      if (!Object.prototype.hasOwnProperty.call(values, props.name)) {
        throw new Error(`Placeholder '{${props.name}}' got no value`);
      }
      return values[props.name];
    }
  }
  return children
    .map(child => {
      return typeof child === 'string' ? child : jsonToText(values, ...child);
    })
    .join('');
};

const interpolateValues = (string, values) => {
  return string.replace(/{([^}]+)}/g, (match, name) => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) {
      throw new Error(`Placeholder '{${name}}' got no value`);
    }
    return values[name];
  });
};

const renderStringTranslation = (translation, values) => {
  if (typeof translation === 'string') {
    return interpolateValues(translation, values);
  } else {
    return jsonToText(values, ...translation);
  }
};

export function Singular({children}) {
  return children;
}

Singular.propTypes = {
  children: PropTypes.any.isRequired,
};

export function Plural({children}) {
  return children;
}

Plural.propTypes = {
  children: PropTypes.any.isRequired,
};

const getGettextFuncs = jedInstance => {
  const gettext = jedInstance.gettext.bind(jedInstance);
  const ngettext = jedInstance.ngettext.bind(jedInstance);
  let pgettext = jedInstance.pgettext ? jedInstance.pgettext.bind(jedInstance) : undefined;
  let npgettext = jedInstance.npgettext ? jedInstance.npgettext.bind(jedInstance) : undefined;

  if (!pgettext) {
    pgettext = (ctx, ...params) => gettext(...params);
  }
  if (!npgettext) {
    npgettext = (ctx, ...params) => ngettext(...params);
  }

  return {gettext, ngettext, pgettext, npgettext};
};

const pickGettextFunc = (context, gettext, pgettext) => {
  if (context) {
    return (...args) => pgettext(context, ...args);
  } else {
    return gettext;
  }
};

const getParamValues = element => {
  const obj = Object.create(null);
  React.Children.forEach(element.props.children, child => {
    if (React.isValidElement(child) && child.type === Param) {
      obj[child.props.name] = {value: child.props.value, wrapper: child.props.wrapper};
    }
  });
  return obj;
};

const getContextParams = args => {
  if (args.length === 0) {
    return {context: undefined, params: {}};
  } else if (args.length === 1) {
    if (typeof args[0] === 'object') {
      return {context: undefined, params: args[0]};
    } else {
      return {context: args[0], params: {}};
    }
  } else {
    return {context: args[0], params: args[1]};
  }
};

const getNPlurals = jedInstance => {
  const {domain, locale_data: localeData} = jedInstance.options || {};
  const pluralForms = localeData?.[domain]?.['']?.plural_forms;

  if (!pluralForms) {
    return null;
  }

  const match = pluralForms.match(/^nplurals=(\d+)/);
  if (!match) {
    return null;
  }

  return Number(match[1]);
};

export const makeComponents = jedInstance => {
  const {gettext, ngettext, pgettext, npgettext} = getGettextFuncs(jedInstance);
  const nPlurals = getNPlurals(jedInstance);

  function Translate({children, context, as, ...rest}) {
    const original = useMemo(() => getTranslatableString(children), [children]);

    const gettextFunc = pickGettextFunc(context, gettext, pgettext);
    const translation = gettextFunc(original);
    let content = children;
    if (translation !== original) {
      content = renderTranslation(translation, getParamValues({props: {children}}));
    }
    // if there's no translation gettext gives us the input string
    // which does not contain the information needed to render it!
    // unfortunately this means that we also cannot strip surrounding
    // whitespace since we may have more than just text in the children,
    // which is why we fail during extraction in that case
    return React.createElement(as, rest, content);
  }

  Translate.string = function string(original, ...args) {
    const {context, params} = getContextParams(args);
    const gettextFunc = pickGettextFunc(context, gettext, pgettext);
    return renderStringTranslation(gettextFunc(collapseWhitespace(original)), params);
  };

  Translate.propTypes = {
    children: PropTypes.any.isRequired,
    context: PropTypes.string,
    comment: PropTypes.string,
    as: PropTypes.elementType,
  };

  Translate.defaultProps = {
    context: undefined,
    comment: undefined,
    as: React.Fragment,
  };

  function PluralTranslate({children, count, context, as, ...rest}) {
    const [singularString, pluralString] = useMemo(() => {
      let singular, plural;
      React.Children.forEach(children, child => {
        if (!React.isValidElement(child)) {
          throw new Error(`Unexpected PluralTranslate child: ${child}`);
        } else if (child.type === Singular) {
          singular = getTranslatableString(child.props.children);
        } else if (child.type === Plural) {
          plural = getTranslatableString(child.props.children);
        }
      });

      return [singular, plural];
    }, [children]);

    function getChild(plural) {
      const component = plural ? Plural : Singular;
      for (const child of React.Children.toArray(children)) {
        if (React.isValidElement(child) && child.type === component) {
          return child;
        }
      }
    }

    const gettextFunc = pickGettextFunc(context, ngettext, npgettext);
    const translation = gettextFunc(singularString, pluralString, count);
    let content;
    if (translation === singularString) {
      content = getChild(false);
    } else if (translation === pluralString) {
      content = getChild(true);
    } else {
      // For languages with only one plural, the plural translation is
      // used even if count == 1. In that case the corresponding <Plural>
      // component must be rendered.
      const plural = nPlurals === 1 || count !== 1;
      const values = getParamValues(getChild(plural));
      content = renderTranslation(translation, values);
    }
    return React.createElement(as, rest, content);
  }

  PluralTranslate.propTypes = {
    children: PropTypes.any.isRequired,
    count: PropTypes.number.isRequired,
    context: PropTypes.string,
    comment: PropTypes.string,
    as: PropTypes.elementType,
  };

  PluralTranslate.defaultProps = {
    context: undefined,
    comment: undefined,
    as: React.Fragment,
  };

  // eslint-disable-next-line no-shadow
  PluralTranslate.string = function string(singular, plural, count = 1, ...args) {
    const {context, params} = getContextParams(args);
    const gettextFunc = pickGettextFunc(context, ngettext, npgettext);
    return renderStringTranslation(
      gettextFunc(collapseWhitespace(singular), collapseWhitespace(plural), count),
      params
    );
  };

  return {Translate, PluralTranslate};
};
