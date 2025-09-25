/**
 * 创建系统标签数据
 */

function createSystemTagsData() {
    console.log('🏷️ 开始创建系统标签数据...');
    
    const systemTagsData = {
        "meta": {
            "name": "系统标签脑图",
            "author": "system",
            "version": "1.0"
        },
        "format": "node_tree",
        "data": {
            "id": "tags_root",
            "topic": "标签管理",
            "expanded": true,
            "children": [
                {
                    "id": "tag_group_manage",
                    "topic": "管理",
                    "expanded": true,
                    "children": [
                        { "id": "tag_target", "topic": "目标" },
                        { "id": "tag_plan", "topic": "规划" },
                        { "id": "tag_project", "topic": "项目" },
                        { "id": "tag_issue", "topic": "议题" },
                        { "id": "tag_schedule", "topic": "日程" }
                    ]
                },
                {
                    "id": "tag_group_review",
                    "topic": "点评",
                    "expanded": true,
                    "children": [
                        { "id": "tag_milestone", "topic": "里程碑" },
                        { "id": "tag_node", "topic": "节点" },
                        { "id": "tag_difficulty", "topic": "难点" }
                    ]
                },
                {
                    "id": "tag_group_status",
                    "topic": "状态",
                    "expanded": true,
                    "children": [
                        { "id": "tag_planning", "topic": "计划" },
                        { "id": "tag_release", "topic": "发布" },
                        { "id": "tag_progress", "topic": "进行" },
                        { "id": "tag_accept", "topic": "验收" },
                        { "id": "tag_interrupt", "topic": "中断" }
                    ]
                }
            ]
        }
    };
    
    // 保存到localStorage
    try {
        localStorage.setItem('mm:proj:SYS_TAGS:data', JSON.stringify(systemTagsData));
        console.log('✅ 系统标签数据已保存到localStorage');
        
        // 同时保存到AutogenUnifiedStorage
        if (window.AutogenUnifiedStorage) {
            window.AutogenUnifiedStorage.set('autogen:system_tags:data', systemTagsData);
            console.log('✅ 系统标签数据已保存到AutogenUnifiedStorage');
        }
        
        return systemTagsData;
    } catch (error) {
        console.error('❌ 保存系统标签数据失败:', error);
        return null;
    }
}

// 自动执行
setTimeout(() => {
    const data = createSystemTagsData();
    if (data) {
        console.log('🎯 系统标签数据创建完成，尝试刷新标签面板...');
        
        // 触发标签面板重新渲染
        if (window.mindmapController) {
            window.mindmapController.renderTagPanelFromMind();
        }
    }
}, 1000);

window.createSystemTagsData = createSystemTagsData;
