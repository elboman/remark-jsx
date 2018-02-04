# @elboman/remark-jsx

[![npm version](https://img.shields.io/npm/v/@elboman/remark-jsx.svg?style=flat-square)](https://www.npmjs.com/package/@elboman/remark-jsx)
[![MIT licence](https://img.shields.io/github/license/elboman/remark-jsx.svg?style=flat-square)](license)

Add support for JSX custom components in [**remark**][remark] markdown using a whitelist of Elements. They are parsed along with their props to be rendered later with React or any framework of that sort.

> NB: This package is a fork of [@dumpster/remark-custom-element-to-hast](https://github.com/fazouane-marouane/remark-jsx/tree/master/packages/remark-custom-element-to-hast) created in order to enhance JSX parsing to support expressions, converted code to ES6 syntax and updated the test suit with more comprehensive tests.

## Getting started

```jsx
import unified from 'unified';
import remark from 'remark-parse';
import remarkJsx from '@elboman/remark-jsx';

const processor = unified()
  .use(parseMD)
  .use(remarkJsx, {
    componentWhitelist: ['CustomComponent'],
  });

const output = processor.processSync(
  `# Hello World
<CustomComponent withProps={'somestring'} />
<CustomComponent someExpression={15 + 32} />
`
);
```

The above example will output:

```json
{
  "type": "root",
  "children": [
    {
      "type": "element",
      "tagName": "h1",
      "properties": {},
      "children": [
        {
          "type": "text",
          "value": "Hello World"
        }
      ]
    },
    {
      "type": "element",
      "tagName": "CustomComponent",
      "properties": {
        "withProps": {
          "value": "somestring",
          "type": "string"
        }
      },
      "children": []
    },
    {
      "type": "element",
      "tagName": "CustomComponent",
      "properties": {
        "someExpression": {
          "value": "15+32",
          "type": "expression"
        }
      },
      "children": []
    }
  ]
}
```

[remark]: https://github.com/wooorm/remark
[license]: /LICENSE
