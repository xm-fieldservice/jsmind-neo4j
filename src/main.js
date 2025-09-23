import EventBus from './core/EventBus';
import DataController from './controllers/DataController';

// 应用初始化
function initApp() {
  const dataController = new DataController();
  console.log('应用已启动');
}

initApp();
