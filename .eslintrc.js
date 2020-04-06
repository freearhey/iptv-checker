module.exports = {
  root: true,
  env: {
    browser: false,
    node: true,
    es6: true,
  },
  extends: [
    `eslint:recommended`,
    `plugin:prettier/recommended`,
    `prettier/babel`,
  ],
  plugins: [`babel`, `prettier`],
  rules: {
    'no-console': process.env.NODE_ENV === `production` ? `error` : `off`,
    'no-debugger': process.env.NODE_ENV === `production` ? `error` : `off`,
    'babel/no-invalid-this': 0,
    'babel/no-unused-expressions': 0,
    'babel/valid-typeof': 1,
    'no-empty': `off`,
    'no-var': `error`,
    'prefer-template': `error`,
    // quotes: [`warn`, `backtick`],
    eqeqeq: `error`,
    strict: `error`,
    'require-await': `error`,
    'prettier/prettier': [
      `warn`,
      {},
      {
        usePrettierrc: true,
      },
    ],
  },
  parserOptions: {
    parser: `babel-eslint`,
    sourceType: `module`,
    ecmaVersion: 9,
  },
}
