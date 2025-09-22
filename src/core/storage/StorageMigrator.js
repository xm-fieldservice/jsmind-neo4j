/**
 * StorageMigrator - 数据迁移工具
 * 负责从旧存储格式迁移到新的注册式存储系统
 */

/**
 * @typedef {Object} MigrationResult
 * @property {number} success - 成功迁移的项目数
 * @property {number} failed - 迁移失败的项目数
 * @property {number} skipped - 跳过的项目数
 * @property {Array<string>} errors - 错误信息列表
 * @property {Object} details - 详细信息
 */

class StorageMigrator {
    constructor(formalStorage, registry) {
        this.formalStorage = formalStorage;
        this.registry = registry;
        this.legacyPrefixes = [
            'mind:', 'mm:', 'mindmap_', 'project_', 'settings_', 'cache_'
        ];
        
        console.log('[StorageMigrator] 数据迁移工具初始化');
    }

    /**
     * 执行完整的数据迁移
     * @param {Object} options - 迁移选项
     * @param {boolean} options.dryRun - 是否为试运行
     * @param {boolean} options.cleanupLegacy - 是否清理旧数据
     * @param {Array<string>} options.includeTypes - 包含的类型
     * @returns {MigrationResult} - 迁移结果
     */
    async migrateAll(options = {}) {
        const {
            dryRun = false,
            cleanupLegacy = false,
            includeTypes = null
        } = options;

        console.log(`[StorageMigrator] 开始${dryRun ? '试运行' : '正式'}迁移`);

        const result = {
            success: 0,
            failed: 0,
            skipped: 0,
            errors: [],
            details: {
                mindmap: { success: 0, failed: 0, errors: [] },
                project: { success: 0, failed: 0, errors: [] },
                settings: { success: 0, failed: 0, errors: [] },
                cache: { success: 0, failed: 0, errors: [] }
            }
        };

        try {
            // 扫描所有localStorage键
            const legacyKeys = this._scanLegacyKeys();
            console.log(`[StorageMigrator] 发现 ${legacyKeys.length} 个旧格式键`);

            // 按类型分组
            const keysByType = this._groupKeysByType(legacyKeys);

            // 迁移各种类型
            for (const [type, keys] of Object.entries(keysByType)) {
                if (includeTypes && !includeTypes.includes(type)) {
                    console.log(`[StorageMigrator] 跳过类型: ${type}`);
                    continue;
                }

                const typeResult = await this._migrateType(type, keys, dryRun);
                result.success += typeResult.success;
                result.failed += typeResult.failed;
                result.skipped += typeResult.skipped;
                result.errors.push(...typeResult.errors);
                result.details[type] = typeResult;
            }

            // 清理旧数据
            if (!dryRun && cleanupLegacy && result.success > 0) {
                const cleanupResult = this._cleanupLegacyData(legacyKeys);
                console.log(`[StorageMigrator] 清理旧数据: ${cleanupResult.cleaned} 个键`);
            }

            console.log(`[StorageMigrator] 迁移完成: 成功 ${result.success}, 失败 ${result.failed}, 跳过 ${result.skipped}`);

        } catch (error) {
            console.error('[StorageMigrator] 迁移过程异常:', error);
            result.errors.push(`迁移过程异常: ${error.message}`);
        }

        return result;
    }

    /**
     * 迁移脑图数据
     * @param {Array<string>} keys - 脑图相关的键
     * @param {boolean} dryRun - 是否为试运行
     * @returns {Object} - 迁移结果
     */
    async _migrateMindmaps(keys, dryRun) {
        const result = { success: 0, failed: 0, skipped: 0, errors: [] };

        for (const key of keys) {
            try {
                const rawData = localStorage.getItem(key);
                if (!rawData) {
                    result.skipped++;
                    continue;
                }

                const legacyData = JSON.parse(rawData);
                
                // 推断脑图ID
                const mindId = this._inferMindmapId(key, legacyData);
                if (!mindId) {
                    result.errors.push(`无法推断脑图ID: ${key}`);
                    result.failed++;
                    continue;
                }

                // 检查是否已存在
                if (this.formalStorage.exists('mindmap', mindId)) {
                    console.log(`[StorageMigrator] 脑图已存在，跳过: ${mindId}`);
                    result.skipped++;
                    continue;
                }

                // 转换数据格式
                const formalData = this._convertMindmapData(legacyData, mindId);
                
                if (!dryRun) {
                    // 存储到新系统
                    const stored = this.formalStorage.store('mindmap', mindId, formalData, {
                        migratedFrom: key,
                        migrationDate: new Date().toISOString()
                    });

                    if (stored) {
                        result.success++;
                        console.log(`[StorageMigrator] ✅ 迁移脑图成功: ${mindId}`);
                    } else {
                        result.failed++;
                        result.errors.push(`存储脑图失败: ${mindId}`);
                    }
                } else {
                    result.success++; // 试运行计为成功
                    console.log(`[StorageMigrator] [试运行] 脑图: ${mindId}`);
                }

            } catch (error) {
                result.failed++;
                result.errors.push(`迁移脑图异常 ${key}: ${error.message}`);
                console.error(`[StorageMigrator] 迁移脑图异常 ${key}:`, error);
            }
        }

        return result;
    }

    /**
     * 迁移项目数据
     * @param {Array<string>} keys - 项目相关的键
     * @param {boolean} dryRun - 是否为试运行
     * @returns {Object} - 迁移结果
     */
    async _migrateProjects(keys, dryRun) {
        const result = { success: 0, failed: 0, skipped: 0, errors: [] };

        // 检查项目目录键
        const catalogKey = 'mm_project_catalog_v1';
        const catalogData = localStorage.getItem(catalogKey);
        
        if (!catalogData) {
            console.log('[StorageMigrator] 未找到项目目录数据');
            return result;
        }

        try {
            const projects = JSON.parse(catalogData);
            
            for (const project of projects) {
                try {
                    const projectId = project.id || project.project_id;
                    if (!projectId) {
                        result.errors.push('项目缺少ID');
                        result.failed++;
                        continue;
                    }

                    // 检查是否已存在
                    if (this.formalStorage.exists('project', projectId)) {
                        result.skipped++;
                        continue;
                    }

                    // 转换项目数据
                    const formalData = this._convertProjectData(project);

                    if (!dryRun) {
                        const stored = this.formalStorage.store('project', projectId, formalData, {
                            migratedFrom: catalogKey,
                            migrationDate: new Date().toISOString()
                        });

                        if (stored) {
                            result.success++;
                            console.log(`[StorageMigrator] ✅ 迁移项目成功: ${projectId}`);
                        } else {
                            result.failed++;
                            result.errors.push(`存储项目失败: ${projectId}`);
                        }
                    } else {
                        result.success++;
                        console.log(`[StorageMigrator] [试运行] 项目: ${projectId}`);
                    }

                } catch (error) {
                    result.failed++;
                    result.errors.push(`迁移项目异常: ${error.message}`);
                }
            }

        } catch (error) {
            result.errors.push(`解析项目目录失败: ${error.message}`);
            console.error('[StorageMigrator] 解析项目目录失败:', error);
        }

        return result;
    }

    /**
     * 扫描旧格式的localStorage键
     * @private
     */
    _scanLegacyKeys() {
        const legacyKeys = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && this._isLegacyKey(key)) {
                legacyKeys.push(key);
            }
        }

        return legacyKeys;
    }

    /**
     * 检查是否为旧格式键
     * @private
     */
    _isLegacyKey(key) {
        // 排除新格式键
        if (key.startsWith('reg:')) {
            return false;
        }

        // 检查是否匹配旧格式前缀
        return this.legacyPrefixes.some(prefix => key.startsWith(prefix));
    }

    /**
     * 按类型分组键
     * @private
     */
    _groupKeysByType(keys) {
        const groups = {
            mindmap: [],
            project: [],
            settings: [],
            cache: []
        };

        for (const key of keys) {
            if (key.startsWith('mind:') || key.startsWith('mm:') || key.includes('mindmap')) {
                groups.mindmap.push(key);
            } else if (key.includes('project') || key === 'mm_project_catalog_v1') {
                groups.project.push(key);
            } else if (key.includes('settings') || key.includes('config')) {
                groups.settings.push(key);
            } else if (key.includes('cache') || key.includes('temp')) {
                groups.cache.push(key);
            }
        }

        return groups;
    }

    /**
     * 迁移指定类型
     * @private
     */
    async _migrateType(type, keys, dryRun) {
        switch (type) {
            case 'mindmap':
                return await this._migrateMindmaps(keys, dryRun);
            case 'project':
                return await this._migrateProjects(keys, dryRun);
            case 'settings':
                return await this._migrateSettings(keys, dryRun);
            case 'cache':
                return await this._migrateCache(keys, dryRun);
            default:
                return { success: 0, failed: 0, skipped: keys.length, errors: [`未知类型: ${type}`] };
        }
    }

    /**
     * 推断脑图ID
     * @private
     */
    _inferMindmapId(key, data) {
        // 从键名推断
        if (key.includes(':')) {
            const parts = key.split(':');
            if (parts.length >= 2) {
                return parts[1];
            }
        }

        // 从数据推断
        if (data && data.data && data.data.id) {
            return data.data.id;
        }

        if (data && data.meta && data.meta.mind_id) {
            return data.meta.mind_id;
        }

        // 生成默认ID
        return `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 转换脑图数据格式
     * @private
     */
    _convertMindmapData(legacyData, mindId) {
        return {
            id: mindId,
            format: legacyData.format || 'node_tree',
            data: legacyData.data || legacyData,
            meta: {
                mind_id: mindId,
                format_version: 1,
                saved_at: new Date().toISOString(),
                source: 'migration',
                ...(legacyData.meta || {})
            }
        };
    }

    /**
     * 转换项目数据格式
     * @private
     */
    _convertProjectData(legacyProject) {
        return {
            id: legacyProject.id || legacyProject.project_id,
            name: legacyProject.name || '未命名项目',
            status: legacyProject.status || 'active',
            priority: legacyProject.priority || 'medium',
            tags: legacyProject.tags || [],
            payload: legacyProject.payload || null,
            createdAt: legacyProject.createdAt || legacyProject.created_at || new Date().toISOString(),
            updatedAt: legacyProject.updatedAt || legacyProject.last_modified || new Date().toISOString()
        };
    }

    /**
     * 迁移设置数据
     * @private
     */
    async _migrateSettings(keys, dryRun) {
        // 简单实现，可根据需要扩展
        return { success: 0, failed: 0, skipped: keys.length, errors: ['设置迁移暂未实现'] };
    }

    /**
     * 迁移缓存数据
     * @private
     */
    async _migrateCache(keys, dryRun) {
        // 缓存数据通常不需要迁移，直接跳过
        return { success: 0, failed: 0, skipped: keys.length, errors: [] };
    }

    /**
     * 清理旧数据
     * @private
     */
    _cleanupLegacyData(keys) {
        let cleaned = 0;

        for (const key of keys) {
            try {
                localStorage.removeItem(key);
                cleaned++;
            } catch (error) {
                console.warn(`[StorageMigrator] 清理键失败 ${key}:`, error);
            }
        }

        return { cleaned };
    }
}

// 导出
export default StorageMigrator;
