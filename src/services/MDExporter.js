/**
 * MD格式导出器
 * 将当前脑图数据转换为人类可读的Markdown格式
 */
class MDExporter {
    constructor() {
        this.templates = {
            header: `# {title}

## 项目信息
- **项目ID**: {id}
- **创建时间**: {createTime}
- **最后更新**: {updateTime}
- **节点总数**: {nodeCount}

---

`,
            node: `## {title}

{content}

{tags}
{attachments}

---

`
        };
    }

    /**
     * 将脑图数据转换为MD格式
     */
    exportToMD(data) {
        if (!data) {
            return this.createEmptyMD();
        }

        const root = data.data || data;
        const stats = this.calculateStats(root);
        
        let md = this.generateHeader(root, stats);
        md += this.generateNodeContent(root, 1);
        md += this.generateFooter();
        
        return md;
    }

    /**
     * 生成文档头部
     */
    generateHeader(root, stats) {
        return this.templates.header
            .replace('{title}', root.label || root.topic || '未命名脑图')
            .replace('{id}', root.id || 'unknown')
            .replace('{createTime}', new Date().toLocaleString('zh-CN'))
            .replace('{updateTime}', new Date().toLocaleString('zh-CN'))
            .replace('{nodeCount}', stats.totalNodes);
    }

    /**
     * 递归生成节点内容
     */
    generateNodeContent(node, level) {
        if (!node) return '';
        
        const indent = '#'.repeat(Math.min(level + 1, 6));
        let content = '';
        
        // 节点标题
        content += `${indent} ${node.label || node.topic || '未命名节点'}\n\n`;
        
        // 节点内容
        if (node.content) {
            content += `${node.content}\n\n`;
        }
        
        // 标签
        if (node.tags && node.tags.length > 0) {
            content += `**标签**: ${node.tags.join(', ')}\n\n`;
        }
        
        // 附件
        if (node.attachments && node.attachments.length > 0) {
            content += `**附件**: ${node.attachments.length}个\n\n`;
            node.attachments.forEach((att, index) => {
                content += `- ${att.name || `附件${index + 1}`}\n`;
            });
            content += '\n';
        }
        
        // 子节点
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                content += this.generateNodeContent(child, level + 1);
            });
        }
        
        return content;
    }

    /**
     * 生成文档尾部
     */
    generateFooter() {
        return `---
*文档生成于 ${new Date().toLocaleString('zh-CN')}*
`;
    }

    /**
     * 计算统计信息
     */
    calculateStats(root) {
        let totalNodes = 0;
        
        const countNodes = (node) => {
            if (!node) return;
            totalNodes++;
            if (node.children) {
                node.children.forEach(countNodes);
            }
        };
        
        countNodes(root);
        
        return { totalNodes };
    }

    /**
     * 创建空MD文档
     */
    createEmptyMD() {
        return `# 空脑图

## 项目信息
- **项目ID**: empty
- **创建时间**: ${new Date().toLocaleString('zh-CN')}
- **最后更新**: ${new Date().toLocaleString('zh-CN')}
- **节点总数**: 0

---

## 根节点

这是一个空的脑图文档。

---

*文档生成于 ${new Date().toLocaleString('zh-CN')}*
`;
    }

    /**
     * 保存MD文档到本地
     */
    async saveMDToFile(data) {
        const mdContent = this.exportToMD(data);
        const filename = this.generateFilename(data);
        
        try {
            // 优先使用现代文件系统API
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Markdown文档',
                        accept: { 'text/markdown': ['.md'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(mdContent);
                await writable.close();
                return { success: true, filename: filename };
            } else {
                // 回退方案：传统下载
                const blob = new Blob([mdContent], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                return { success: true, filename: filename };
            }
        } catch (error) {
            console.error('MD保存失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 生成文件名
     */
    generateFilename(data) {
        const root = data.data || data;
        const title = root.label || root.topic || '脑图';
        const cleaned = title
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/\s+/g, '_')
            .slice(0, 50);
        return `${cleaned}_${new Date().toISOString().slice(0, 10)}.md`;
    }
}

// 全局可用
window.MDExporter = new MDExporter();
