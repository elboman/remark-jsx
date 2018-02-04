const enhancedHtmlParser = require('../enhanced-html-parser');

describe('enhancedHtmlParser', () => {
  const componentsWhitelist = ['SomeComponent', 'SomeOtherComponent'];
  let parse, rawTransformer;

  beforeEach(() => {
    parse = enhancedHtmlParser(componentsWhitelist);
    rawTransformer = jest.fn();
  });

  it('should parse custom components correctly', () => {
    const result = parse('## Some title\n<SomeComponent />', rawTransformer);
    expect(result).toMatchObject({
      children: [
        {
          tagName: 'SomeComponent',
          type: 'element',
          startsAt: 14,
        },
      ],
    });
  });

  it('should pass the rest of the source to the rawTransformer', () => {
    const result = parse(
      '## This is a title\n<SomeComponent />',
      rawTransformer
    );
    expect(rawTransformer).toHaveBeenCalledWith({
      startsAt: 0,
      endsAt: 19,
      type: 'raw',
      value: '## This is a title\n',
    });
  });

  it('should parse component string props in different syntaxes', () => {
    const stringPropsResults = [
      parse(`# title\n<SomeComponent foo="bar" />`, jest.fn()),
      parse(`# title\n<SomeComponent foo='bar' />`, jest.fn()),
      parse(`# title\n<SomeComponent foo={"bar"} />`, jest.fn()),
      parse(`# title\n<SomeComponent foo={'bar'} />`, jest.fn()),
      parse(`# title\n<SomeComponent foo={\`bar\`} />`, jest.fn()),
    ];

    stringPropsResults.forEach(result =>
      expect(result.children[0]).toMatchObject({
        tagName: 'SomeComponent',
        properties: {
          foo: { value: 'bar', type: 'string' },
        },
      })
    );
  });

  it('should parse component expression props', () => {
    const expressionPropsResults = [
      parse(`# title\n<SomeComponent foo={1 + 3} />`, jest.fn()),
      parse(`# title\n<SomeComponent foo={ 1 + 3} />`, jest.fn()),
      parse(`# title\n<SomeComponent foo={1 + 3 } />`, jest.fn()),
      parse(`# title\n<SomeComponent foo={1+3} />`, jest.fn()),
    ];

    expressionPropsResults.forEach(result =>
      expect(result.children[0]).toMatchObject({
        tagName: 'SomeComponent',
        properties: {
          foo: { value: '1+3', type: 'expression' },
        },
      })
    );
  });
});
