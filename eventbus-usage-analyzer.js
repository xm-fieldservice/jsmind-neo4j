const EventBus = require('./src/core/EventBus').default; // 导入默认导出

console.log('EventBus对象结构:', Object.keys(EventBus));
console.log('EventBus实例属性:', Object.keys(EventBus));

// 现在EventBus应该是EventBus类的实例
if (!EventBus || !EventBus.eventStats) {
  console.error('无法访问EventBus实例或eventStats属性');
  process.exit(1);
}

// 获取事件统计
const eventStats = EventBus.eventStats;

// 生成报告
console.log('事件总线使用情况报告');
console.log('====================');
console.log(`事件总数: ${eventStats.size}`);
console.log('\n事件触发频率（前20名）:');

// 按触发次数排序
const sortedEvents = Array.from(eventStats.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

sortedEvents.forEach(([event, count]) => {
  console.log(`- ${event}: ${count}次`);
});
