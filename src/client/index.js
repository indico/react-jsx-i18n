import React from 'react';
import PropTypes from 'prop-types';


export class Param extends React.Component {
    static propTypes = {
        // eslint-disable-next-line react/no-unused-prop-types
        name: PropTypes.string.isRequired,
        value: PropTypes.any.isRequired,
        children: PropTypes.string,
    };

    static defaultProps = {
        children: undefined,
    };

    render() {
        const {value, children} = this.props;
        return React.isValidElement(value) ? React.cloneElement(value, {}, children) : value;
    }
}

const getTranslatableString = (children) => {
    const usedParams = new Set();
    const items = React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) {
            // plain value, nothing to change here
            if (typeof child !== 'string') {
                throw new Error(`Unexpected Translate child type: ${typeof child}`);
            }
            return child;
        } else if (child.type !== Param) {
            throw new Error(`Translate child components must be of type Param; got ${child.type.name}`);
        } else {
            const {name: paramName, children: paramContent} = child.props;
            if (usedParams.has(paramName)) {
                throw new Error(`Translate params must be unique; found ${paramName} more than once`);
            } else if (
                paramContent !== undefined &&
                typeof paramContent !== 'string'
            ) {
                throw new Error(`Unexpected Param child type: ${typeof paramContent}`);
            }
            usedParams.add(paramName);
            return paramContent === undefined ? `{${paramName}}` : `{${paramName}}${paramContent}{/${paramName}}`;
        }
    });
    return items.join('').replace(/\s+/g, ' ').trim();
};


const jsonToReact = (values, component, props, ...children) => {
    /* eslint-disable react/prop-types */
    component = {Fragment: React.Fragment, Param}[component];
    if (component === Param) {
        // inject the value from the original Param in the translated string's Param
        props = {...props, value: values[props.name]};
    }
    return React.createElement(component, props, ...children.map((child) => {
        return typeof child === 'string' ? child : jsonToReact(values, ...child);
    }));
};


const renderTranslation = (translation, values) => {
    if (typeof translation === 'string') {
        return translation;
    } else {
        return jsonToReact(values, ...translation);
    }
};


const jsonToText = (component, props, ...children) => {
    if (component === 'Param') {
        if (children.length) {
            return `{${props.name}}${children.join('')}{/${props.name}}`;
        } else {
            return `{${props.name}}`;
        }
    }
    return children.map((child) => {
        return typeof child === 'string' ? child : jsonToText(...child);
    }).join('');
};


const renderStringTranslation = (translation) => {
    if (typeof translation === 'string') {
        return translation;
    } else {
        // we do not support placeholders in Translate.string(), but
        // when compiling a translation dict to JSON we cannot know in
        // which context a string is used, so we have to replace the params
        // with the original placeholders
        return jsonToText(...translation);
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


const getGettextFuncs = (args) => {
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
        throw new Error('Expected object containing gettext/ngettext(/pgettext/npgattext) or 2/4 args with the funcs');
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

        static string(string, context = undefined) {
            const gettextFunc = pickGettextFunc(context, gettext, pgettext);
            return renderStringTranslation(gettextFunc(string));
        }

        constructor(props) {
            super(props);
            this.paramValues = Object.create(null);
            React.Children.forEach(props.children, (child) => {
                if (React.isValidElement(child) && child.type === Param) {
                    this.paramValues[child.props.name] = child.props.value;
                }
            });
            this.original = getTranslatableString(props.children);
        }

        render() {
            const {children, context} = this.props;
            const gettextFunc = pickGettextFunc(context, gettext, pgettext);
            const translation = gettextFunc(this.original);
            if (translation === this.original) {
                // if there's no translation gettext gives us the input string
                // which does not contain the information needed to render it!
                return children;
            }
            return renderTranslation(translation, this.paramValues);
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

        static string(singular, plural, count = 1, context = undefined) {
            const gettextFunc = pickGettextFunc(context, ngettext, npgettext);
            return renderStringTranslation(gettextFunc(singular, plural, count));
        }

        constructor(props) {
            super(props);
            React.Children.forEach(props.children, (child) => {
                if (!React.isValidElement(child)) {
                    throw new Error(`Unexpected PluralTranslate child: ${child}`);
                } else if (child.type === Singular) {
                    this.singularString = getTranslatableString(child.props.children);
                } else if (child.type === Plural) {
                    this.pluralString = getTranslatableString(child.props.children);
                }
            });
        }

        getParamValues(element) {
            const obj = Object.create(null);
            React.Children.forEach(element.props.children, (child) => {
                if (React.isValidElement(child) && child.type === Param) {
                    obj[child.props.name] = child.props.value;
                }
            });
            return obj;
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
            const values = this.getParamValues(this.getChild(count !== 1));
            return renderTranslation(translation, values);
        }
    }


    return {Translate, PluralTranslate};
};
