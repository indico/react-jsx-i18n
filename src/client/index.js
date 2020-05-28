import React from 'react';
import PropTypes from 'prop-types';

export class Param extends React.Component {
  static propTypes = {
    // eslint-disable-next-line react/no-unused-prop-types
    name: PropTypes.string.isRequired,
    value: PropTypes.any,
    wrapper: PropTypes.element,
    children: PropTypes.string,
  };

  static defaultProps = {
    value: undefined,
    wrapper: undefined,
    children: undefined,
  };

  render() {
    const {wrapper, value, children} = this.props;
    return wrapper
      ? React.cloneElement(wrapper, {}, value !== undefined ? value : children)
      : value;
  }
}

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

export class Singular extends React.Component {
  static propTypes = {
    children: PropTypes.any.isRequired,
  };

  render() {
    const {children} = this.props;
    return children;
  }
}

export class Plural extends React.Component {
  static propTypes = {
    children: PropTypes.any.isRequired,
  };

  render() {
    const {children} = this.props;
    return children;
  }
}

const getGettextFuncs = args => {
  let gettext, ngettext, pgettext, npgettext;
  if (args.length === 1) {
    const [obj] = args;
    gettext = obj.gettext.bind(obj);
    ngettext = obj.ngettext.bind(obj);
    pgettext = obj.pgettext ? obj.pgettext.bind(obj) : undefined;
    npgettext = obj.npgettext ? obj.npgettext.bind(obj) : undefined;
  } else if (args.length === 2) {
    [gettext, ngettext] = args;
  } else if (args.length === 4) {
    [gettext, ngettext, pgettext, npgettext] = args;
  } else {
    throw new Error(
      'Expected object containing gettext/ngettext(/pgettext/npgattext) or 2/4 args with the funcs'
    );
  }

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

export const makeComponents = (...args) => {
  const {gettext, ngettext, pgettext, npgettext} = getGettextFuncs(args);

  class Translate extends React.Component {
    static propTypes = {
      children: PropTypes.any.isRequired,
      context: PropTypes.string,
    };

    static defaultProps = {
      context: undefined,
    };

    // eslint-disable-next-line no-shadow, react/sort-comp
    static string(string, ...args) {
      const {context, params} = getContextParams(args);
      const gettextFunc = pickGettextFunc(context, gettext, pgettext);
      return renderStringTranslation(gettextFunc(collapseWhitespace(string)), params);
    }

    constructor(props) {
      super(props);
      this.original = getTranslatableString(props.children);
    }

    render() {
      const {children, context} = this.props;
      const gettextFunc = pickGettextFunc(context, gettext, pgettext);
      const translation = gettextFunc(this.original);
      if (translation === this.original) {
        // if there's no translation gettext gives us the input string
        // which does not contain the information needed to render it!
        // unfortunately this means that we also cannot strip surrounding
        // whitespace since we may have more than just text in the children,
        // which is why we fail during extraction in that case
        return children;
      }
      return renderTranslation(translation, getParamValues(this));
    }
  }

  class PluralTranslate extends React.Component {
    static propTypes = {
      children: PropTypes.any.isRequired,
      count: PropTypes.number.isRequired,
      context: PropTypes.string,
    };

    static defaultProps = {
      context: undefined,
    };

    // eslint-disable-next-line no-shadow
    static string(singular, plural, count = 1, ...args) {
      const {context, params} = getContextParams(args);
      const gettextFunc = pickGettextFunc(context, ngettext, npgettext);
      return renderStringTranslation(
        gettextFunc(collapseWhitespace(singular), collapseWhitespace(plural), count),
        params
      );
    }

    constructor(props) {
      super(props);
      React.Children.forEach(props.children, child => {
        if (!React.isValidElement(child)) {
          throw new Error(`Unexpected PluralTranslate child: ${child}`);
        } else if (child.type === Singular) {
          this.singularString = getTranslatableString(child.props.children);
        } else if (child.type === Plural) {
          this.pluralString = getTranslatableString(child.props.children);
        }
      });
    }

    getChild(plural) {
      const {children} = this.props;
      const component = plural ? Plural : Singular;
      for (const child of React.Children.toArray(children)) {
        if (React.isValidElement(child) && child.type === component) {
          return child;
        }
      }
    }

    render() {
      const {count, context} = this.props;
      const gettextFunc = pickGettextFunc(context, ngettext, npgettext);
      const translation = gettextFunc(this.singularString, this.pluralString, count);
      if (translation === this.singularString) {
        return this.getChild(false);
      } else if (translation === this.pluralString) {
        return this.getChild(true);
      }
      const values = getParamValues(this.getChild(count !== 1));
      return renderTranslation(translation, values);
    }
  }

  return {Translate, PluralTranslate};
};
