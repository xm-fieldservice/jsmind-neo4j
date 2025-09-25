// 快速诊断卡片问题
console.log('=== 快速诊断 ===');

// 1. 检查项目数据
const catalogData = localStorage.getItem('mm_project_catalog_v1');
const projects = catalogData ? JSON.parse(catalogData) : [];
console.log('1. 项目数据:', projects);

// 2. 检查DOM结构
const catalog = document.getElementById('project-catalog');
console.log('2. 项目列表DOM:', catalog);

if (catalog) {
    const cards = catalog.querySelectorAll('.proj-card');
    console.log('3. 卡片数量:', cards.length);
    
    cards.forEach((card, index) => {
        const title = card.querySelector('.proj-title')?.textContent;
        const buttons = card.querySelectorAll('button[data-action]');
        const tags = card.querySelectorAll('.proj-tag');
        
        console.log(`卡片 ${index}:`, {
            title,
            buttonCount: buttons.length,
            tagCount: tags.length,
            hasTagsDiv: !!card.querySelector('.proj-tags')
        });
        
        // 检查按钮事件
        buttons.forEach((btn, btnIndex) => {
            const action = btn.getAttribute('data-action');
            console.log(`  按钮 ${btnIndex}: ${action}`);
        });
    });
}

// 3. 手动测试标签提取
if (projects.length > 0) {
    const project = projects[0];
    console.log('4. 测试标签提取:', project.name);
    console.log('   有payload:', !!project.payload);
    console.log('   有data:', !!project.payload?.data);
    
    if (project.payload?.data) {
        const rootContent = project.payload.data.content;
        console.log('   根节点内容:', rootContent);
        
        if (rootContent && rootContent.includes('标签:')) {
            const lines = rootContent.split('\n');
            const tagLine = lines.find(line => line.startsWith('标签: '));
            if (tagLine) {
                const tags = tagLine.substring(4).trim().split(',').map(t => t.trim());
                console.log('   提取的标签:', tags);
            }
        }
    }
}

// 4. 强制重新渲染测试
console.log('5. 强制重新渲染...');
if (typeof renderCatalog === 'function') {
    renderCatalog();
    console.log('   重新渲染完成');
} else {
    console.log('   renderCatalog函数不可用');
}

console.log('=== 诊断完成 ===');
