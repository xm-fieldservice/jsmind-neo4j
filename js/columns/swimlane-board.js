/**
 * 泳道看板 - 工作栏组件
 * 程序员 - 工作栏生态系统示例组件
 * 
 * 功能：
 * - 多维度泳道切换（状态维度、部门维度）
 * - 任务卡片拖拽功能
 * - 部门筛选和数据可视化
 * - 完整的任务管理看板
 * 
 * 版本：v1.0.0
 * 创建日期：2025-10-01
 */

;(function(global) {
    'use strict';
    
    console.log('[泳道看板] 组件加载中...');
    
    // 等待ColumnRegistry就绪
    function waitForRegistry(callback, maxAttempts = 50) {
        let attempts = 0;
        
        const check = () => {
            attempts++;
            
            if (global.ColumnRegistry && global.ColumnRegistry._initialized) {
                console.log('[泳道看板] ✅ ColumnRegistry已就绪');
                callback();
            } else if (attempts < maxAttempts) {
                setTimeout(check, 100);
            } else {
                console.error('[泳道看板] ❌ ColumnRegistry初始化超时');
            }
        };
        
        check();
    }
    
    // 等待DOM加载完成
    function whenReady(callback) {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }
    
    // 注册泳道看板组件
    function registerSwimlaneBoard() {
        try {
            const result = global.ColumnRegistry.register({
                id: 'swimlane-board',
                title: '泳道看板',
                icon: '🏊',
                position: 'after:detail',
                defaultActive: false,
                renderFn: (container) => {
                    console.log('[泳道看板] renderFn被调用，容器:', container);
                    
                    // 确保容器存在
                    if (!container) {
                        console.error('[泳道看板] ❌ 容器不存在！');
                        return;
                    }
                    
                    // 注入样式到 head（避免在容器内注入 style 标签导致样式失效）
                    const styleId = 'swimlane-board-styles';
                    if (!document.getElementById(styleId)) {
                        const styleElement = document.createElement('style');
                        styleElement.id = styleId;
                        styleElement.textContent = `
/* 泳道看板专属样式 */
.swimlane-board-wrapper {
    width: 100%;
    height: 100%;
    min-height: 600px;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: relative;
    padding: 20px;
    box-sizing: border-box;
}

/* 测试：添加明显的视觉提示 */
.swimlane-board-wrapper::before {
    content: "🏊 泳道看板已加载";
    display: block;
    color: white;
    font-size: 24px;
    font-weight: bold;
    text-align: center;
    padding: 20px;
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
    margin-bottom: 20px;
}

/* 部门选择标签 */
.sb-department-filter {
                                background: #fff;
                                padding: 12px 16px;
                                border-bottom: 1px solid #e9ecef;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                            }
                            
                            .sb-filter-left {
                                flex: 1;
                            }
                            
                            .sb-filter-label {
                                font-size: 13px;
                                color: #666;
                                margin-bottom: 8px;
                                font-weight: 500;
                            }
                            
                            .sb-department-tabs {
                                display: flex;
                                gap: 6px;
                                flex-wrap: wrap;
                            }
                            
                            .sb-department-tab {
                                padding: 6px 12px;
                                background: #f8f9fa;
                                color: #495057;
                                border: 1px solid #dee2e6;
                                border-radius: 16px;
                                font-size: 12px;
                                cursor: pointer;
                                transition: all 0.2s;
                            }
                            
                            .sb-department-tab:hover {
                                background: #e9ecef;
                                border-color: #adb5bd;
                            }
                            
                            .sb-department-tab.active {
                                background: #667eea;
                                color: white;
                                border-color: #667eea;
                            }
                            
                            /* 维度切换开关 */
                            .sb-dimension-switch {
                                display: flex;
                                gap: 8px;
                                align-items: center;
                            }
                            
                            .sb-switch-label {
                                font-size: 12px;
                                color: #666;
                                font-weight: 500;
                            }
                            
                            .sb-switch-group {
                                display: flex;
                                background: #f8f9fa;
                                border-radius: 6px;
                                padding: 2px;
                                border: 1px solid #dee2e6;
                            }
                            
                            .sb-switch-btn {
                                padding: 4px 12px;
                                font-size: 12px;
                                color: #495057;
                                background: transparent;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                transition: all 0.2s;
                                white-space: nowrap;
                            }
                            
                            .sb-switch-btn:hover {
                                color: #667eea;
                            }
                            
                            .sb-switch-btn.active {
                                background: #667eea;
                                color: white;
                                box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
                            }
                            
                            /* 泳道容器 */
                            .sb-swimlane-container {
                                flex: 1;
                                display: flex;
                                background: #f8f9fa;
                                min-height: 400px;
                                overflow-x: auto;
                            }
                            
                            /* 单个泳道 */
                            .sb-swimlane {
                                flex: 1;
                                min-width: 280px;
                                display: flex;
                                flex-direction: column;
                                border-right: 1px solid #e9ecef;
                                background: white;
                            }
                            
                            .sb-swimlane:last-child {
                                border-right: none;
                            }
                            
                            /* 泳道头部 */
                            .sb-swimlane-header {
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                padding: 12px 16px;
                                text-align: center;
                                font-weight: 600;
                                font-size: 14px;
                            }
                            
                            .sb-swimlane.status-待开始 .sb-swimlane-header {
                                background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
                            }
                            
                            .sb-swimlane.status-进行中 .sb-swimlane-header {
                                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                            }
                            
                            .sb-swimlane.status-已完成 .sb-swimlane-header {
                                background: linear-gradient(135deg, #007bff 0%, #6610f2 100%);
                            }
                            
                            /* 泳道内容区 */
                            .sb-swimlane-content {
                                flex: 1;
                                padding: 16px;
                                overflow-y: auto;
                            }
                            
                            /* 任务卡片 */
                            .sb-task-card {
                                background: white;
                                border-radius: 6px;
                                padding: 12px 16px;
                                margin-bottom: 8px;
                                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                                cursor: move;
                                transition: all 0.2s ease;
                                border-left: 4px solid #667eea;
                            }
                            
                            .sb-task-card:hover {
                                transform: translateY(-2px);
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                            }
                            
                            .sb-task-card.dragging {
                                opacity: 0.5;
                                transform: rotate(5deg);
                            }
                            
                            .sb-task-card.status-待开始 {
                                border-left-color: #6c757d;
                                background: linear-gradient(90deg, rgba(108, 117, 125, 0.05) 0%, rgba(73, 80, 87, 0.05) 100%);
                            }
                            
                            .sb-task-card.status-进行中 {
                                border-left-color: #28a745;
                                background: linear-gradient(90deg, rgba(40, 167, 69, 0.05) 0%, rgba(32, 201, 151, 0.05) 100%);
                            }
                            
                            .sb-task-card.status-已完成 {
                                border-left-color: #007bff;
                                background: linear-gradient(90deg, rgba(0, 123, 255, 0.05) 0%, rgba(102, 16, 242, 0.05) 100%);
                            }
                            
                            .sb-task-title {
                                font-size: 14px;
                                font-weight: 500;
                                color: #333;
                                margin-bottom: 8px;
                                line-height: 1.4;
                            }
                            
                            .sb-task-meta {
                                font-size: 12px;
                                color: #666;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                            }
                            
                            .sb-task-tags {
                                display: flex;
                                gap: 4px;
                                flex-wrap: wrap;
                            }
                            
                            .sb-task-tag {
                                background: #e3f2fd;
                                color: #1976d2;
                                padding: 2px 6px;
                                border-radius: 6px;
                                font-size: 10px;
                            }
                            
                            .sb-task-department {
                                background: #f3e5f5;
                                color: #7b1fa2;
                                padding: 2px 6px;
                                border-radius: 6px;
                                font-size: 10px;
                                font-weight: 500;
                            }
                            
                            .sb-task-status-label {
                                background: #e3f2fd;
                                color: #1976d2;
                                padding: 2px 6px;
                                border-radius: 6px;
                                font-size: 10px;
                            }
                            
                            /* 空状态 */
                            .sb-empty-lane {
                                text-align: center;
                                padding: 40px 20px;
                                color: #999;
                                font-size: 14px;
                            }
                            
.sb-empty-lane-icon {
    font-size: 32px;
    margin-bottom: 8px;
}
`;
                        document.head.appendChild(styleElement);
                        console.log('[泳道看板] ✅ 样式已注入到 <head>');
                    }
                    
                    // 注入HTML结构（不包含 style 标签）
                    container.innerHTML = `
                        <div class="swimlane-board-wrapper">
                            <!-- 部门选择标签与维度切换 -->
                            <div class="sb-department-filter">
                                <div class="sb-filter-left">
                                    <div class="sb-filter-label">选择部门：</div>
                                    <div class="sb-department-tabs">
                                        <span class="sb-department-tab active" data-dept="全部">全部部门</span>
                                        <span class="sb-department-tab" data-dept="软件部">软件部</span>
                                        <span class="sb-department-tab" data-dept="工程部">工程部</span>
                                        <span class="sb-department-tab" data-dept="设计部">设计部</span>
                                        <span class="sb-department-tab" data-dept="测试部">测试部</span>
                                    </div>
                                </div>
                                
                                <!-- 维度切换开关 -->
                                <div class="sb-dimension-switch">
                                    <span class="sb-switch-label">泳道维度：</span>
                                    <div class="sb-switch-group">
                                        <button class="sb-switch-btn" data-dimension="department">部门</button>
                                        <button class="sb-switch-btn active" data-dimension="status">状态</button>
                                    </div>
                                </div>
                            </div>

                            <!-- 泳道容器 (动态生成) -->
                            <div class="sb-swimlane-container" id="sbSwimlaneContainer">
                                <!-- 泳道将根据选择的维度动态生成 -->
                            </div>
                        </div>
                    `;
                    
                    console.log('[泳道看板] HTML已注入，容器内容长度:', container.innerHTML.length);
                    
                    // 初始化泳道看板逻辑
                    initSwimlaneBoard(container);
                    
                    console.log('[泳道看板] ✅ renderFn执行完成');
                },
                metadata: {
                    version: '1.0.0',
                    author: '程序员',
                    description: '多维度任务泳道看板 - 支持状态/部门维度切换和任务拖拽管理',
                    keywords: ['泳道', '看板', '任务管理', '拖拽', '可视化']
                }
            });
            
            if (result) {
                console.log('[泳道看板] ✅ 组件注册成功');
            } else {
                console.error('[泳道看板] ❌ 组件注册失败');
            }
            
        } catch (error) {
            console.error('[泳道看板] ❌ 注册过程出错:', error);
        }
    }
    
    // 泳道看板初始化逻辑
    function initSwimlaneBoard(container) {
        console.log('[泳道看板] 初始化中...');
        
        // 测试数据 - 项目任务数据
        const mockProjectData = [
            {
                id: 'proj_001',
                title: 'AI项目管理系统开发',
                content: '标签：项目，软件部\n开发一个基于AI的项目管理应用。',
                department: '软件部',
                status: '进行中',
                priority: '高'
            },
            {
                id: 'proj_002',
                title: '脑图可视化组件优化',
                content: '标签：项目，软件部，工程部\n优化脑图渲染性能。',
                department: '软件部',
                status: '待开始',
                priority: '中'
            },
            {
                id: 'proj_003',
                title: '关系图数据结构设计',
                content: '标签：项目，工程部\n设计Neo4j数据关系图结构。',
                department: '工程部',
                status: '进行中',
                priority: '高'
            },
            {
                id: 'proj_004',
                title: 'UI设计系统规范',
                content: '标签：项目，设计部\n建立统一的设计系统和组件规范。',
                department: '设计部',
                status: '已完成',
                priority: '中'
            },
            {
                id: 'proj_005',
                title: '前端架构重构',
                content: '标签：项目，软件部\n重构前端架构，提升代码质量。',
                department: '软件部',
                status: '进行中',
                priority: '高'
            }
        ];
        
        // 全局状态
        let currentDimension = 'status';
        
        // 维度配置
        const dimensionConfig = {
            status: {
                name: '状态',
                lanes: ['待开始', '进行中', '已完成', '其他'],
                colors: {
                    '待开始': 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                    '进行中': 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    '已完成': 'linear-gradient(135deg, #007bff 0%, #6610f2 100%)',
                    '其他': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }
            },
            department: {
                name: '部门',
                lanes: ['软件部', '工程部', '设计部', '测试部'],
                colors: {
                    '软件部': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '工程部': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    '设计部': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    '测试部': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                }
            }
        };
        
        // DOM引用
        const departmentTabs = container.querySelectorAll('.sb-department-tab');
        const swimlaneContainer = container.querySelector('#sbSwimlaneContainer');
        const dimensionSwitchBtns = container.querySelectorAll('.sb-switch-btn');
        
        // 绑定事件
        function bindEvents() {
            // 维度切换按钮事件
            dimensionSwitchBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const dimension = this.dataset.dimension;
                    if (dimension !== currentDimension) {
                        dimensionSwitchBtns.forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                        currentDimension = dimension;
                        generateSwimlanesAndRender();
                        console.log(`🔄 泳道维度切换为: ${dimensionConfig[dimension].name}`);
                    }
                });
            });
            
            // 部门标签切换事件
            departmentTabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    departmentTabs.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    renderDepartmentSections();
                });
            });
            
            // 任务卡片点击事件
            container.addEventListener('click', function(e) {
                if (e.target.closest('.sb-task-card')) {
                    const projectId = e.target.closest('.sb-task-card').dataset.id;
                    handleProjectClick(projectId);
                }
            });
        }
        
        // 动态生成泳道HTML并渲染数据
        function generateSwimlanesAndRender() {
            const config = dimensionConfig[currentDimension];
            swimlaneContainer.innerHTML = '';
            
            config.lanes.forEach(lane => {
                const color = config.colors[lane] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                const swimlaneHTML = `
                    <div class="sb-swimlane status-${lane}" data-lane="${lane}">
                        <div class="sb-swimlane-header" style="background: ${color}">
                            ${lane}
                        </div>
                        <div class="sb-swimlane-content" data-lane="${lane}">
                            <!-- 任务将在这里显示 -->
                        </div>
                    </div>
                `;
                swimlaneContainer.insertAdjacentHTML('beforeend', swimlaneHTML);
            });
            
            renderDepartmentSections();
        }
        
        // 渲染部门区块
        function renderDepartmentSections() {
            const activeTab = container.querySelector('.sb-department-tab.active');
            const selectedDepartment = activeTab ? activeTab.dataset.dept : '全部';
            
            container.querySelectorAll('.sb-swimlane-content').forEach(content => {
                content.innerHTML = '';
            });
            
            let filteredData;
            if (selectedDepartment && selectedDepartment !== '全部') {
                filteredData = mockProjectData.filter(project => project.department === selectedDepartment);
            } else {
                filteredData = mockProjectData.slice();
            }
            
            renderTasksByStatus(filteredData);
            
            container.querySelectorAll('.sb-swimlane-content').forEach(content => {
                if (content.children.length === 0) {
                    content.innerHTML = `
                        <div class="sb-empty-lane">
                            <div class="sb-empty-lane-icon">📝</div>
                            <div class="sb-empty-lane-text">暂无任务</div>
                        </div>
                    `;
                }
            });
        }
        
        // 按当前维度分组渲染到泳道
        function renderTasksByStatus(projects) {
            const config = dimensionConfig[currentDimension];
            const laneGroups = {};
            
            config.lanes.forEach(lane => {
                laneGroups[lane] = [];
            });
            
            projects.forEach(project => {
                let laneKey;
                if (currentDimension === 'status') {
                    laneKey = project.status;
                } else if (currentDimension === 'department') {
                    laneKey = project.department;
                }
                
                if (laneGroups[laneKey]) {
                    laneGroups[laneKey].push(project);
                }
            });
            
            Object.keys(laneGroups).forEach(lane => {
                const tasks = laneGroups[lane];
                const swimlaneContent = container.querySelector(`.sb-swimlane-content[data-lane="${lane}"]`);
                
                if (swimlaneContent && tasks.length > 0) {
                    const tasksHTML = tasks.map(project => {
                        const tags = extractTagsFromContent(project.content);
                        return `
                            <div class="sb-task-card status-${project.status}" data-id="${project.id}" data-status="${project.status}" data-department="${project.department}" draggable="true">
                                <div class="sb-task-title">${project.title}</div>
                                <div class="sb-task-meta">
                                    <div class="sb-task-tags">
                                        ${tags.map(tag => `<span class="sb-task-tag">${tag}</span>`).join('')}
                                    </div>
                                    <div style="display: flex; gap: 4px;">
                                        <span class="sb-task-department">${project.department}</span>
                                        <span class="sb-task-status-label">${project.status}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                    swimlaneContent.innerHTML = tasksHTML;
                }
            });
            
            bindDragEvents();
        }
        
        // 绑定拖拽事件
        function bindDragEvents() {
            const taskCards = container.querySelectorAll('.sb-task-card');
            
            taskCards.forEach(card => {
                card.addEventListener('dragstart', handleDragStart);
                card.addEventListener('dragend', handleDragEnd);
            });
            
            container.querySelectorAll('.sb-swimlane-content').forEach(content => {
                content.addEventListener('dragover', handleDragOver);
                content.addEventListener('drop', handleDrop);
            });
        }
        
        function handleDragStart(e) {
            e.dataTransfer.setData('text/plain', e.target.dataset.id);
            e.target.classList.add('dragging');
        }
        
        function handleDragEnd(e) {
            e.target.classList.remove('dragging');
        }
        
        function handleDragOver(e) {
            e.preventDefault();
        }
        
        function handleDrop(e) {
            e.preventDefault();
            const taskId = e.dataTransfer.getData('text/plain');
            const targetSwimlane = e.target.closest('.sb-swimlane');
            const newLane = targetSwimlane?.dataset.lane;
            
            if (taskId && newLane) {
                const task = mockProjectData.find(p => p.id === taskId);
                if (task) {
                    if (currentDimension === 'status') {
                        task.status = newLane;
                    } else if (currentDimension === 'department') {
                        task.department = newLane;
                    }
                    renderDepartmentSections();
                    console.log(`✅ 任务已移动到: ${newLane}`);
                }
            }
        }
        
        function extractTagsFromContent(content) {
            const tagMatch = content.match(/标签：(.+)/);
            if (tagMatch) {
                return tagMatch[1].split(/[,，]/).map(tag => tag.trim()).filter(tag => tag);
            }
            return [];
        }
        
        function handleProjectClick(projectId) {
            const project = mockProjectData.find(p => p.id === projectId);
            if (project) {
                console.log(`点击项目: ${project.title}`, project);
                alert(`项目详情：\n${project.title}\n部门：${project.department}\n状态：${project.status}`);
            }
        }
        
        // 初始化
        bindEvents();
        generateSwimlanesAndRender();
        
        console.log('[泳道看板] ✅ 初始化完成');
    }
    
    // 启动注册流程
    whenReady(() => {
        setTimeout(() => {
            waitForRegistry(() => {
                registerSwimlaneBoard();
            });
        }, 1000);
    });
    
})(window || this);
