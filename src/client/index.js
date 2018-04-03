import React from 'react';
import PropTypes from 'prop-types';


export class Param extends React.Component {
    static propTypes = {
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



export const makeComponents = (...args) => {
    let gettext, ngettext;
    if (args.length === 1) {
        const [obj] = args;
        gettext = obj.gettext.bind(obj);
        ngettext = obj.ngettext.bind(obj);
    } else if (args.length === 2) {
        [gettext, ngettext] = args;
    } else {
        throw new Error('Expected object containing gettext/ngettext or the two functions as args');
    }


    class Translate extends React.Component {
        static propTypes = {
            children: PropTypes.any.isRequired
        };

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
            const {children} = this.props;
            const translation = gettext(this.original);
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
        };

        constructor(props) {
            super(props);
            this.singular = null;
            this.plural = null;
            this.paramValues = {};
            React.Children.forEach(props.children, (child) => {
                if (!React.isValidElement(child)) {
                    throw new Error(`Unexpected PluralTranslate child: ${child}`);
                } else if (child.type === Singular) {
                    this.singular = child;
                    this.paramValues.singular = this.getParamValues(child);
                } else if (child.type === Plural) {
                    this.plural = child;
                    this.paramValues.plural = this.getParamValues(child);
                }
            });
            this.singularString = getTranslatableString(this.singular.props.children);
            this.pluralString = getTranslatableString(this.plural.props.children);
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

        render() {
            const {count} = this.props;
            const translation = ngettext(this.singularString, this.pluralString, count);
            if (translation === this.singularString) {
                return this.singular.props.children;
            } else if (translation === this.pluralString) {
                return this.plural.props.children;
            }
            const values = count === 1 ? this.paramValues.singular : this.paramValues.plural;
            return renderTranslation(translation, values);
        }
    }


    return {Translate, PluralTranslate}
};
