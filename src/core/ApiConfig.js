/**
 * 统一API配置管理 - 解决API端口和路径混乱问题
 * 
 * 架构原则：
 * 1. 统一配置管理，消除硬编码
 * 2. 环境感知的端口配置
 * 3. 标准化的API路径管理
 * 4. 错误处理和重试机制
 */

;(function(global) {
    'use strict';
    
    class ApiConfig {
        constructor() {
            // 环境检测和端口配置
            this.environment = this._detectEnvironment();
            this.ports = this._initializePorts();
            this.baseUrls = this._initializeBaseUrls();
            
            // API路径映射
            this.apiPaths = {
                jsonBase: {
                    sync: '/api/json-base/sync',
                    save: '/api/save-json-base',
                    status: '/api/status'
                },
                mindmap: {
                    sync: '/api/sync-mindmap',
                    export: '/api/export-mindmap'
                },
                registry: {
                    health: '/health',
                    list: '/api/registry/list'
                }
            };
            
            console.log('[ApiConfig] 统一API配置初始化完成', {
                environment: this.environment,
                ports: this.ports,
                baseUrls: this.baseUrls
            });
        }
        
        /**
         * 环境检测
         */
        _detectEnvironment() {
            // 检测是否在开发环境
            const isDevelopment = window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1';
            
            return {
                isDevelopment,
                hostname: window.location.hostname,
                port: window.location.port
            };
        }
        
        /**
         * 初始化端口配置
         */
        _initializePorts() {
            return {
                frontend: 8082,      // 前端HTTP服务器
                registry: 8081,      // Registry服务
                jsonBase: 5001,      // JSON底座API
                mainApi: 8000        // 主API服务
            };
        }
        
        /**
         * 初始化基础URL
         */
        _initializeBaseUrls() {
            const protocol = window.location.protocol;
            const hostname = this.environment.isDevelopment ? '127.0.0.1' : window.location.hostname;
            
            return {
                registry: `${protocol}//${hostname}:${this.ports.registry}`,
                jsonBase: `${protocol}//${hostname}:${this.ports.jsonBase}`,
                mainApi: `${protocol}//${hostname}:${this.ports.mainApi}`
            };
        }
        
        /**
         * 获取完整API URL
         */
        getApiUrl(service, endpoint) {
            const baseUrl = this.baseUrls[service];
            const path = this.apiPaths[service]?.[endpoint];
            
            if (!baseUrl || !path) {
                throw new Error(`[ApiConfig] 未知的API配置: ${service}.${endpoint}`);
            }
            
            return `${baseUrl}${path}`;
        }
        
        /**
         * 获取JSON底座同步URL
         */
        getJsonBaseSyncUrl() {
            return this.getApiUrl('jsonBase', 'sync');
        }
        
        /**
         * 获取脑图同步URL
         */
        getMindmapSyncUrl() {
            return this.getApiUrl('jsonBase', 'sync'); // 使用同一个端点
        }
        
        /**
         * 健康检查URL
         */
        getHealthCheckUrl(service = 'registry') {
            return this.getApiUrl(service, 'health');
        }
        
        /**
         * 获取服务状态
         */
        async checkServiceHealth(service) {
            try {
                const url = this.getHealthCheckUrl(service);
                const response = await fetch(url, { 
                    method: 'GET',
                    timeout: 5000 
                });
                
                return {
                    service,
                    healthy: response.ok,
                    status: response.status,
                    url
                };
            } catch (error) {
                return {
                    service,
                    healthy: false,
                    error: error.message,
                    url: this.getHealthCheckUrl(service)
                };
            }
        }
        
        /**
         * 检查所有服务健康状态
         */
        async checkAllServices() {
            const services = ['registry', 'jsonBase'];
            const results = await Promise.all(
                services.map(service => this.checkServiceHealth(service))
            );
            
            const healthyServices = results.filter(r => r.healthy).length;
            const totalServices = results.length;
            
            console.log('[ApiConfig] 服务健康检查完成', {
                healthy: `${healthyServices}/${totalServices}`,
                details: results
            });
            
            return {
                overall: healthyServices === totalServices,
                healthy: healthyServices,
                total: totalServices,
                services: results
            };
        }
    }
    
    // 创建全局单例
    const apiConfig = new ApiConfig();
    
    // 全局导出
    global.ApiConfig = apiConfig;
    
    // 模块导出
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { ApiConfig, apiConfig };
    }
    
})(typeof window !== 'undefined' ? window : global);
