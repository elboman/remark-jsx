import unified from 'unified';
import remark from 'remark-parse';

import plugin from '../index';

describe('remark-jsx plugin', () => {
  const render = text =>
    unified()
      .use(remark)
      .use(plugin, {
        componentWhitelist: ['SomeComponent'],
      })
      .processSync(text);

  it('should work correctly', () => {
    const { contents } = render('# This is markdown\n<SomeComponent />');
    expect(contents).toMatchSnapshot();
  });
});
