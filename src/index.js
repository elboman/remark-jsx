'use strict';

const toHAST = require('mdast-util-to-hast');
const map = require('unist-util-map');
const jsxParserFactory = require('./jsx-parser');

function plugin(options) {
  const settings = options || {};
  const componentWhitelist = settings.componentWhitelist || [];
  const proto = this.Parser.prototype;

  proto.options.blocks = []; // Let's ignore this
  proto.blockTokenizers.customElement = jsxParserFactory(
    componentWhitelist,
    true
  );
  proto.blockMethods.splice(
    proto.blockMethods.indexOf('html'),
    1,
    'customElement'
  );

  proto.inlineTokenizers.customElement = jsxParserFactory(
    componentWhitelist,
    false
  );
  proto.inlineMethods.splice(
    proto.inlineMethods.indexOf('html'),
    1,
    'customElement'
  );

  const pipeTransformers = (...transformers) => node =>
    transformers.reduce(map, node);

  this.Compiler = function(node) {
    const transform = pipeTransformers(
      // flatten false text nodes
      node => {
        if (node.children) {
          node.children = node.children.reduce((prev, current) => {
            if (current.type === 'text' && current.children)
              Array.prototype.push.apply(prev, current.children);
            else prev.push(current);
            return prev;
          }, []);
        }
        return node;
      },
      // transform unprocessed inner MDAST node into HAST
      node => {
        if (node.unprocessed) {
          const result = toHAST(node, { allowDangerousHTML: false });
          node.children = null;
          return result;
        }
        return node;
      },
      // merge successive text nodes into a single one
      node => {
        if (node.children) {
          node.children = node.children.reduce(
            (acc, n) => {
              const children = acc.children;
              let prev = acc.prev;
              if (n.type === 'text') {
                if (prev) {
                  prev.value += n.value;
                } else {
                  prev = n;
                  children.push(n);
                }
              } else {
                prev = null;
                children.push(n);
              }
              return {
                prev: prev,
                children: children,
              };
            },
            {
              prev: null,
              children: [],
            }
          ).children;
        }
        return node;
      },
      // Remove trailing whitespace
      node => {
        if (node.children) {
          node.children = node.children.filter(
            node => node.type !== 'text' || node.value !== '\n'
          );
        }
        return node;
      },
      // Remove unnecessary fields
      node =>
        Object.keys(node)
          .filter(
            key =>
              ![
                'position',
                'innerStartsAt',
                'innerEndsAt',
                'startsAt',
                'endsAt',
              ].includes(key)
          )
          .reduce(
            (prev, current) => ({ ...prev, [current]: node[current] }),
            {}
          ),
      // transform to HAST
      node => toHAST(node, { allowDangerousHTML: false })
    );

    return transform(node);
  };
}

module.exports = plugin;
