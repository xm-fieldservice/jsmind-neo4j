// 测试项目列表功能
console.log('=== 测试项目列表功能 ===');

// 1. 检查容器是否存在
const catalog = document.getElementById('project-catalog');
console.log('1. project-catalog容器:', catalog ? '✅ 存在' : '❌ 不存在');

// 2. 检查数据
const catalogData = localStorage.getItem('mm_project_catalog_v1');
const projects = catalogData ? JSON.parse(catalogData) : [];
console.log('2. 项目数据:', projects.length, '个项目');

// 3. 检查修复模块
console.log('3. 修复模块:', window.ProjectListManager ? '✅ 已加载' : '❌ 未加载');

// 4. 手动触发渲染
if (window.ProjectListManager) {
    console.log('4. 手动触发渲染...');
    window.ProjectListManager.render();
    window.ProjectListManager.bind();
} else {
    console.log('4. ❌ 修复模块未加载，无法手动渲染');
}

// 5. 检查渲染结果
setTimeout(() => {
    const cards = catalog ? catalog.querySelectorAll('.proj-card') : [];
    console.log('5. 渲染结果:', cards.length, '个卡片');
    
    if (cards.length > 0) {
        const firstCard = cards[0];
        const title = firstCard.querySelector('.proj-title')?.textContent;
        const buttons = firstCard.querySelectorAll('button[data-action]');
        const tags = firstCard.querySelectorAll('.proj-tag');
        
        console.log('   第一个卡片:');
        console.log('   - 标题:', title);
        console.log('   - 按钮数量:', buttons.length);
        console.log('   - 标签数量:', tags.length);
        
        if (tags.length > 0) {
            console.log('   - 标签内容:', Array.from(tags).map(tag => tag.textContent));
        }
    }
    
    console.log('=== 测试完成 ===');
}, 100);
