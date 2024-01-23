import * as React from 'react';

export interface ParamProps {
  /** Parameter name */
  name: string;

  /** Value to render */
  value?: any;

  /** A React element to wrap the parameter value/children */
  wrapper?: React.ReactElement;
  children?: React.ReactNode;
}

export const Param: React.FC<ParamProps>;

export interface SingularProps {
  children: React.ReactNode;
}

export const Singular: React.FC<SingularProps>;

export interface PluralProps {
  children: React.ReactNode;
}

export const Plural: React.FC<PluralProps>;

export interface TranslateProps {
  /** Message context */
  context?: string;

  /** An element type to render as */
  as?: React.ComponentType;
  children: React.ReactNode;
}

export const Translate: React.FC<TranslateProps> & {
  /**
   * Translate a string
   * @param string The message to translate
   * @param args Optional context and parameters
   * @returns The translated string
   */
  string: (string: string, ...args: any[]) => string;
};

export interface PluralTranslateProps {
  /** Determines whether the singular or plural will be used */
  count: number;

  /** Message context */
  context?: string;

  /** An element type to render as */
  as?: React.ComponentType;
  children: React.ReactNode;
}

export const PluralTranslate: React.FC<PluralTranslateProps> & {
  /**
   * Translate a string including pluralization
   * @param singular The singular form of the message
   * @param plural The plural form of the message
   * @param count Determines whether the singular or plural will be used
   * @param args Optional context and parameters
   * @returns The translated string
   */
  string: (singular: string, plural: string, count: number, ...args: any[]) => string;
};

export interface Config {
  gettext: (msg: string) => string;
  ngettext: (msg: string, msgpl: string, n: number) => string;
  pgettext?: (ctx: string, msg: string) => string;
  npgettext?: (ctx: string, msg: string, msgpl: string, n: number) => string;
  options?: any;
}

export interface Components {
  Translate: typeof Translate;
  PluralTranslate: typeof PluralTranslate;
}

export function makeComponents(config: Config): Components;
