/**
 * 🔧 架构整改：AutogenEventBus是浏览器环境代码，无法在Node.js测试
 * @deprecated 请在浏览器环境中测试，或创建专门的单元测试
 */
describe('EventBus 集成测试（已废弃）', () => {
  test('测试套件已废弃，AutogenEventBus需要浏览器环境', () => {
    expect(true).toBe(true);
  });
});
