import {defaultConfig, defaultJavaScriptConfig} from './@default';
import {overrideDevConfig} from './@override-dev';

export const configs = {
  default: defaultConfig,
  js: defaultJavaScriptConfig,
  'override-dev': overrideDevConfig,
};
