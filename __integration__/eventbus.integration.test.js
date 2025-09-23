const EventBus = require('../src/core/EventBus');

describe('EventBus 集成测试', () => {
  test('事件订阅与发布', () => {
    const mockCallback = jest.fn();
    const testEvent = 'test-event';
    const testData = { value: 42 };
    
    // 订阅事件
    EventBus.on(testEvent, mockCallback);
    
    // 发布事件
    EventBus.emit(testEvent, testData);
    
    // 验证回调被调用
    expect(mockCallback).toHaveBeenCalledWith(testData);
  });

  test('取消事件订阅', () => {
    const mockCallback = jest.fn();
    const testEvent = 'test-event-unsubscribe';
    
    // 订阅事件
    EventBus.on(testEvent, mockCallback);
    
    // 取消订阅
    EventBus.off(testEvent, mockCallback);
    
    // 发布事件
    EventBus.emit(testEvent, {});
    
    // 验证回调未被调用
    expect(mockCallback).not.toHaveBeenCalled();
  });
});
