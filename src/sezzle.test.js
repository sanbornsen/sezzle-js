const SezzleJS = require('./sezzle');
const Helper = require('./helper');
var sezzleConfig = require('./sezzle.config.json');

describe('Constructor correctly sets the parameters', () => {
  test('Properly sets xpath value when targetXPath is an array', () => {
    const sz = new SezzleJS(sezzleConfig);
    expect(sz.xpath).toEqual(
      sezzleConfig.targetXPath.map((i) => Helper.breakXPath(i))
    );
  })
})