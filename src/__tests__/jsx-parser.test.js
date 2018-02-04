import jsxParserFactory from '../jsx-parser';

describe('jsxParser', () => {
  const componentWhitelist = ['SomeComponent'];

  it('should create a parser correctly', () => {
    let parser = jsxParserFactory(componentWhitelist);
    expect(typeof parser).toBe('function');
    expect(typeof parser.locator).toBe('function');
  });

  describe('locator', () => {
    it('should locate blocks', () => {
      let parser = jsxParserFactory(componentWhitelist);
      const found = parser.locator('Some text <SomeComponent />', 0);
      expect(found).toBe(10);
      const notFound = parser.locator('Some text <SomeComponent />', 11);
      expect(notFound).toBe(-1);
    });
  });
});
