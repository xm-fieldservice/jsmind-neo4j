/**
 * 真实MD文档转脑图脚本
 * 将标准Markdown文档转换为jsMind脑图结构
 */
class RealMDToMindmap {
    constructor() {
        this.idCounter = 0;
        this.patterns = {
            header: /^(#{1,6})\s+(.+)$/,
            emptyLine: /^\s*$/,
            listItem: /^\s*[-*+]\s+(.+)$/,
            codeBlock: /^(```|~~~)/
        };
    }

    /**
     * 转换MD文档为脑图数据
     * @param {string} mdText - Markdown文本
     * @returns {object} jsMind格式数据
     */
    convert(mdText) {
        try {
            const lines = mdText.split('\n');
            const root = this.createRootNode(lines);
            const stack = [{ node: root, level: 0, lineIndex: -1 }];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const headerMatch = line.match(this.patterns.header);
                
                if (headerMatch) {
                    const level = headerMatch[1].length;
                    const title = headerMatch[2].trim();
                    const content = this.extractContent(lines, i + 1);
                    
                    this.addNode(stack, level, title, content, i);
                }
            }
            
            return this.formatForJsMind(root);
        } catch (error) {
            console.error('MD转换失败:', error);
            return this.createEmptyMindmap();
        }
    }

    /**
     * 创建根节点
     */
    createRootNode(lines) {
        // 尝试从第一行H1获取标题
        const firstLine = lines[0] || '';
        const titleMatch = firstLine.match(/^#\s+(.+)$/);
        const title = titleMatch ? titleMatch[1] : '未命名文档';
        
        return {
            id: 'md-root',
            label: title,
            content: this.extractDocumentContent(lines),
            children: []
        };
    }

    /**
     * 提取标题间内容
     */
    extractContent(lines, startIndex) {
        const content = [];
        let i = startIndex;
        
        while (i < lines.length) {
            const line = lines[i].trim();
            
            // 遇到下一个标题停止
            if (line.match(this.patterns.header)) {
                break;
            }
            
            // 跳过空行
            if (line && !line.match(this.patterns.emptyLine)) {
                content.push(line);
            }
            
            i++;
        }
        
        return content.join('\n').trim();
    }

    /**
     * 添加节点到树结构
     */
    addNode(stack, level, title, content, lineIndex) {
        const node = {
            id: `node-${lineIndex}`,
            label: title,
            content: content,
            children: []
        };

        // 找到合适的父节点
        while (stack.length > 1 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        const parent = stack[stack.length - 1];
        parent.node.children.push(node);
        
        stack.push({
            node: node,
            level: level,
            lineIndex: lineIndex
        });
    }

    /**
     * 提取整个文档内容
     */
    extractDocumentContent(lines) {
        return lines.filter(line => 
            !line.match(this.patterns.header) && 
            !line.match(this.patterns.emptyLine)
        ).join('\n').trim();
    }

    /**
     * 格式化为jsMind数据
     */
    formatForJsMind(root) {
        return {
            format: 'node_tree',
            data: this.convertToJsMindTree(root)
        };
    }

    /**
     * 转换为jsMind树结构
     */
    convertToJsMindTree(node) {
        return {
            id: node.id,
            topic: node.label,
            content: node.content,
            expanded: true,
            children: node.children.map(child => this.convertToJsMindTree(child))
        };
    }

    /**
     * 创建空脑图
     */
    createEmptyMindmap() {
        return {
            format: 'node_tree',
            data: {
                id: 'empty-root',
                topic: '空文档',
                content: '文档为空或格式错误',
                children: []
            }
        };
    }

    /**
     * 创建转换按钮
     */
    createConvertButton() {
        const button = document.createElement('button');
        button.textContent = '从MD导入';
        button.className = 'mm-btn mm-green';
        button.addEventListener('click', async () => {
            try {
                const mdText = prompt('请输入Markdown文本:');
                if (mdText) {
                    const data = this.convert(mdText);
                    if (data) {
                        window.mindmapController.loadMindmap(data);
                        window.mindmapController.showToast('MD导入成功');
                    }
                }
            } catch (error) {
                window.mindmapController.showToast('转换错误', 'error');
            }
        });
        return button;
    }

    /**
     * 测试用例
     */
    getTestMD() {
        return `# 项目计划

## 需求分析
项目需求详细描述...

### 功能需求
- 用户管理
- 权限控制
- 数据备份

### 非功能需求
性能要求：响应时间<2秒

## 技术方案
### 前端技术
React + TypeScript

### 后端技术
Node.js + Express

## 开发计划
### 第一阶段
- 需求确认
- 原型设计

### 第二阶段
- 功能开发
- 测试部署`;
    }

    /**
     * 验证转换结果
     */
    validateResult(data) {
        return data && 
               data.format === 'node_tree' && 
               data.data && 
               data.data.topic && 
               Array.isArray(data.data.children);
    }
}

// 全局可用
window.RealMDToMindmap = new RealMDToMindmap();
