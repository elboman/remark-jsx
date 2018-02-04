'use strict';

const blockElements = require('remark-parse/lib/block-elements.json');

const getAllMatches = (regexp, value) => {
  const r = new RegExp(regexp, 'g');
  const matches = [];
  let singleMatch;
  // find multiple matches by calling exec
  // until it finds new ones
  while ((singleMatch = r.exec(value)) !== null) {
    matches.push(singleMatch);
  }
  return matches;
};

const partialTokenizer = (subParser, valueDesc) => {
  const matches = subParser(valueDesc);
  const rawFragments = matches.reduce(
    (prev, current) => {
      const fragments = prev.fragments;
      const lastEndsAt = prev.lastEndsAt;
      if (current.startsAt !== lastEndsAt) {
        fragments.push({
          type: 'raw',
          value: valueDesc.value.substring(
            lastEndsAt - valueDesc.startsAt,
            current.startsAt - valueDesc.startsAt
          ),
          startsAt: lastEndsAt,
          endsAt: current.startsAt,
        });
      }
      return {
        fragments: fragments,
        lastEndsAt: current.endsAt,
      };
    },
    {
      fragments: [],
      lastEndsAt: valueDesc.startsAt,
    }
  );
  if (rawFragments.lastEndsAt !== valueDesc.endsAt) {
    rawFragments.fragments.push({
      type: 'raw',
      value: valueDesc.value.substring(
        rawFragments.lastEndsAt - valueDesc.startsAt
      ),
      startsAt: rawFragments.lastEndsAt,
      endsAt: valueDesc.endsAt,
    });
  }
  Array.prototype.push.apply(matches, rawFragments.fragments);
  return matches.sort((a, b) => a.startsAt - b.startsAt);
};

const pipeTokenizers = (tokenizers, value) => {
  const applyNext = (tokens, next) =>
    Array.prototype.concat.apply(
      [],
      tokens.map(token => (token.type === 'raw' ? next(token) : token))
    );
  return tokenizers.reduce(applyNext, [
    {
      type: 'raw',
      value: value,
      startsAt: 0,
      endsAt: value.length,
    },
  ]);
};

const attributeName = `[a-zA-Z_:][a-zA-Z0-9:._-]*`;
// we match unquoted and quoted attributes in different groups so we can treat them differently
// 1. unquoted props are expressions
const unquoted = `([^"'=<>\`{}]+)`;
// 2. quoted props are strings regardless of single or double quote syntax
const singleQuoted = `(?:'|\`)([^'|\`]*)(?:'|\`)`;
const doubleQuoted = `"([^"]*)"`;
const attributeValue = `(?:${unquoted}|${singleQuoted}|${doubleQuoted})`;
const attribute = `(?:\\s+${attributeName}(?:\\s*={*\\s*${attributeValue}}*)?)`;

const enhancedHtmlParser = componentWhitelist => {
  const components = blockElements.concat(componentWhitelist).join('|');

  const parseOpeningTags = (isAutoClosing, valueDesc) => {
    return partialTokenizer(function(valueDesc) {
      const regexp = `<(${components})(${attribute}*)\\s*${
        isAutoClosing ? '/>' : '>'
      }`;
      const propertiesRegex = `(${attributeName})\\s*={*\\s*${attributeValue}}*?`;
      return getAllMatches(regexp, valueDesc.value).map(match => ({
        value: match[0],
        type: isAutoClosing ? 'autoCloseTag' : 'openTag',
        tagName: match[1],
        startsAt: match.index + valueDesc.startsAt,
        endsAt: valueDesc.startsAt + match.index + match[0].length,
        properties: getAllMatches(propertiesRegex, match[2]).reduce(
          (props, m) => {
            // add prop type based on the syntax
            const propName = m[1];
            const expressionValue =
              m[2] && typeof m[2] === 'string'
                ? m[2].replace(/\s/g, '')
                : undefined;
            const stringValue = m[3] || m[4];
            props[propName] = {
              value: expressionValue || stringValue,
              type: expressionValue ? 'expression' : 'string',
            };
            return props;
          },
          {}
        ),
      }));
    }, valueDesc);
  };

  const parseClosingTags = valueDesc => {
    return partialTokenizer(function(valueDesc) {
      const regexp = `</(${components})\\s*>`;
      return getAllMatches(regexp, valueDesc.value).map(match => ({
        value: match[0],
        type: 'closingTag',
        tagName: match[1],
        startsAt: match.index + valueDesc.startsAt,
        endsAt: valueDesc.startsAt + match.index + match[0].length,
      }));
    }, valueDesc);
  };

  const parse = (value, rawTransformer) => {
    const tokens = pipeTokenizers(
      [
        parseClosingTags,
        v => parseOpeningTags(true, v),
        v => parseOpeningTags(false, v),
      ],
      value
    );
    const tree = tokens.reduce(
      (stack, t) => {
        let element;
        switch (t.type) {
          case 'closingTag':
            element = stack.pop();
            if (element.tagName !== t.tagName)
              throw new Error(
                `Error parsing source: closing tag </${
                  t.tagName
                }> does not match opening tag <${element.tagName}>`
              );
            element.endsAt = t.endsAt;
            element.innerEndsAt = t.startsAt;
            break;
          case 'openTag':
            element = {
              type: 'element',
              tagName: t.tagName,
              properties: t.properties,
              children: [],
              startsAt: t.startsAt,
              innerStartsAt: t.endsAt,
            };
            stack[stack.length - 1].children.push(element);
            stack.push(element);
            break;
          case 'autoCloseTag':
            element = {
              type: 'element',
              tagName: t.tagName,
              properties: t.properties,
              children: [],
              startsAt: t.startsAt,
              endsAt: t.endsAt,
            };
            stack[stack.length - 1].children.push(element);
            break;
          default:
            element = rawTransformer
              ? rawTransformer(t)
              : {
                  type: 'text',
                  value: t.value,
                  startsAt: t.startsAt,
                  endsAt: t.endsAt,
                };
            Array.prototype.push.apply(
              stack[stack.length - 1].children,
              element
            );
            break;
        }
        return stack;
      },
      [
        {
          type: 'root',
          children: [],
        },
      ]
    );

    return tree[0];
  };

  return parse;
};

module.exports = enhancedHtmlParser;
