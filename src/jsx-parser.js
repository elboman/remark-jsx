const enhancedHtmlParser = require('./enhanced-html-parser');

const jsxParserFactory = (componentWhitelist = [], isBlockParser) => {
  const parseHtml = enhancedHtmlParser(componentWhitelist);
  let running = false;

  function parser(eat, value) {
    if (running) return;

    const self = this;
    const tokenize = isBlockParser ? self.tokenizeBlock : self.tokenizeInline;
    try {
      running = true;
      const dump = {
        type: 'raw',
        children: [],
      };
      const tree = parseHtml(value, rawToken => {
        // console.log('raw token is', rawToken);
        const substringToEat = value.substring(0, rawToken.endsAt);
        const substringToParse = value.substring(
          rawToken.startsAt,
          rawToken.endsAt
        );
        const now = eat.now();
        const parsed = eat(substringToEat).reset(
          {
            type: 'p',
            value: tokenize.call(self, substringToParse, now),
          },
          dump
        );
        parsed.value.forEach(node => {
          node.unprocessed = true;
          node.startsAt = rawToken.startsAt;
          node.endsAt = rawToken.endsAt;
        });
        return parsed.value;
      });

      if (tree.children.length === 0 || tree.children[0].type !== 'element') {
        return;
      }

      // console.log('TREE IS');
      // console.log(tree);

      const nodes = tree.children.reduce(
        (acc, n) => {
          const stop = acc.stop;
          const nodes = acc.nodes;
          if (!stop) {
            if (
              !(
                n.type === 'element' ||
                (n.type === 'text' && (n.value === ' ' || n.value === '\n'))
              )
            ) {
              return {
                nodes: nodes,
                stop: true,
              };
            }
            nodes.push(n);
          }
          return {
            nodes: nodes,
            stop: stop,
          };
        },
        {
          nodes: [],
          stop: false,
        }
      ).nodes;

      return eat(value.substring(0, nodes[nodes.length - 1].endsAt))({
        type: 'p',
        value: {
          type: 'root',
          children: nodes,
        },
      });
    } finally {
      running = false;
    }
  }

  parser.locator = (value, fromIndex) => value.indexOf('<', fromIndex);

  return parser;
};

module.exports = jsxParserFactory;
