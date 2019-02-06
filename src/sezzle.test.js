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

  test('Properly sets rendertopath value when renderToPath is an array', () => {
    const sz = new SezzleJS(sezzleConfig);
    expect(sz.rendertopath).toEqual(sezzleConfig.renderToPath);
  })

  test('Properly sets xpath value when targetXPath is a string', () => {
    const newConfig = {...sezzleConfig, ...{targetXPath: '#id/.class'}}
    const sz = new SezzleJS(newConfig);
    expect(sz.xpath).toEqual([Helper.breakXPath(newConfig.targetXPath)]);
  })

  test('Properly sets rendertopath value when renderToPath is a string', () => {
    const newConfig = {
      ...sezzleConfig,
      ...{
        renderToPath: '../..',
        targetXPath: '#id/.class'
      }
    };
    const sz = new SezzleJS(newConfig);
    expect(sz.rendertopath).toEqual([newConfig.renderToPath]);
  })

  test('Properly sets rendertopath value syncup with xpath', () => {
    const newConfig = {
      ...sezzleConfig,
      ...{
        renderToPath: '../..'
      }
    };
    const sz = new SezzleJS(newConfig);
    expect(sz.rendertopath).toEqual([newConfig.renderToPath, null]);
  })

  test(`Properly sets ignoredPriceElements ` +
      `value when options.ignoredPriceElements is` +
      `a string`, () => {
        const newConfig = {
          ...sezzleConfig,
          ...{
            ignoredPriceElements: '#id/.class'
          }
        };
        const sz = new SezzleJS(newConfig);
        expect(sz.ignoredPriceElements)
          .toEqual([['#id', '.class']]);
  })

  test(`Properly sets ignoredPriceElements ` +
      `value when options.ignoredPriceElements is` +
      `an array`, () => {
        const sz = new SezzleJS(sezzleConfig);
        expect(sz.ignoredPriceElements)
          .toEqual([['#id-3', '.class-3']]);
  })

  test(`Properly sets hideElements ` +
      `value when options.hideClasses is` +
      `a string`, () => {
        const newConfig = {
          ...sezzleConfig,
          ...{
            hideClasses: '#id/.class'
          }
        };
        const sz = new SezzleJS(newConfig);
        expect(sz.hideElements)
          .toEqual([['#id', '.class']]);
  })

  test(`Properly sets hideElements ` +
      `value when options.hideClasses is` +
      `an array`, () => {
        const newConfig = {
          ...sezzleConfig,
          ...{
            hideClasses: ['#id/.class']
          }
        };
        const sz = new SezzleJS(newConfig);
        expect(sz.hideElements)
          .toEqual([['#id', '.class']]);
  })
})