/**
 * MD文档转脑图工具
 * 将包装格式的MD文档转换为jsMind可用数据
 */
class MDToMindmapConverter {
    constructor() {
        this.mdFilePath = 'data/unified_mindmap_storage.md';
    }

    /**
     * 从MD文档提取脑图数据
     */
    extractMindmapFromMD(mdContent) {
        try {
            // 查找JSON代码块
            const jsonMatch = mdContent.match(/```json\s*([\s\S]*?)\s*```/);
            if (!jsonMatch) {
                throw new Error('未找到JSON数据块');
            }

            const jsonStr = jsonMatch[1].trim();
            const mindmapData = JSON.parse(jsonStr);
            
            return this.validateMindmapData(mindmapData);
        } catch (error) {
            console.error('MD转脑图失败:', error);
            return null;
        }
    }

    /**
     * 验证数据完整性
     */
    validateMindmapData(data) {
        if (!data || !data.data) {
            throw new Error('无效的数据结构');
        }

        // 确保基本字段存在
        const required = ['id', 'label', 'children'];
        const root = data.data;
        
        for (const field of required) {
            if (!(field in root)) {
                throw new Error(`缺少必要字段: ${field}`);
            }
        }

        return data;
    }

    /**
     * 从文件加载并转换
     */
    async loadFromMDFile() {
        try {
            // 模拟从文件读取（实际实现需根据环境调整）
            const mdContent = this.getMDContent();
            return this.extractMindmapFromMD(mdContent);
        } catch (error) {
            console.error('文件加载失败:', error);
            return null;
        }
    }

    /**
     * 获取MD内容（模拟实现）
     */
    getMDContent() {
        // 实际应用中，这里会从文件读取
        return document.querySelector('#md-content')?.textContent || '';
    }

    /**
     * 创建转换按钮
     */
    createConvertButton() {
        const button = document.createElement('button');
        button.textContent = '从MD导入脑图';
        button.className = 'mm-btn mm-blue';
        button.addEventListener('click', async () => {
            try {
                const data = await this.loadFromMDFile();
                if (data) {
                    window.mindmapController.loadMindmap(data);
                    window.mindmapController.showToast('MD导入成功');
                } else {
                    window.mindmapController.showToast('导入失败', 'error');
                }
            } catch (error) {
                window.mindmapController.showToast('转换错误', 'error');
            }
        });
        return button;
    }
}

// 全局可用
window.MDToMindmapConverter = new MDToMindmapConverter();
