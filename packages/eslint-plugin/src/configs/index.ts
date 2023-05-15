/* eslint-disable @mufan/explicit-return-type */

export const configs = {
  get js() {
    return require('./@js').default;
  },
  get default() {
    return require('./@default').default;
  },
  get 'override-dev'() {
    return require('./@override-dev').default;
  },
};
