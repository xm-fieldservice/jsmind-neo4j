/**
 * D3.js关系图可视化组件
 * 基于AutoGen 0.7.1框架规范实现
 * 与Neo4j数据库集成的关系图渲染器
 */

class D3RelationGraph {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            nodeRadius: options.nodeRadius || 20,
            linkDistance: options.linkDistance || 100,
            charge: options.charge || -300,
            ...options
        };
        
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        
        this.init();
    }
    
    init() {
        console.log('[D3关系图] 初始化可视化组件');
        
        // 清空容器
        this.container.selectAll("*").remove();
        
        // 创建SVG画布
        this.svg = this.container
            .append("svg")
            .attr("width", this.options.width)
            .attr("height", this.options.height)
            .style("border", "1px solid #ccc")
            .style("background-color", "#fafafa");
            
        // 添加缩放和拖拽支持
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                this.svg.select(".graph-container")
                    .attr("transform", event.transform);
            });
            
        this.svg.call(zoom);
        
        // 创建图形容器组
        this.graphContainer = this.svg.append("g")
            .attr("class", "graph-container");
            
        // 创建力导向仿真
        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id).distance(this.options.linkDistance))
            .force("charge", d3.forceManyBody().strength(this.options.charge))
            .force("center", d3.forceCenter(this.options.width / 2, this.options.height / 2))
            .force("collision", d3.forceCollide().radius(this.options.nodeRadius + 5));
    }
    
    /**
     * 加载Neo4j数据并渲染关系图
     * @param {Object} data - 包含nodes和links的数据对象
     */
    loadData(data) {
        console.log('[D3关系图] 加载数据:', data);
        
        if (!data || !data.nodes || !data.links) {
            console.error('[D3关系图] 数据格式错误');
            return;
        }
        
        this.nodes = data.nodes;
        this.links = data.links;
        
        this.render();
    }
    
    /**
     * 从Neo4j API获取数据并渲染
     */
    async fetchAndRender() {
        try {
            console.log('[D3关系图] 从Neo4j获取数据...');
            
            const response = await fetch('/api/neo4j/graph-data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.loadData(data);
            
        } catch (error) {
            console.error('[D3关系图] 获取数据失败:', error);
            this.showError('无法连接到Neo4j数据库');
        }
    }
    
    /**
     * 渲染关系图
     */
    render() {
        console.log('[D3关系图] 开始渲染关系图');
        
        // 清除现有元素
        this.graphContainer.selectAll("*").remove();
        
        // 渲染连线
        const link = this.graphContainer.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(this.links)
            .enter().append("line")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", d => Math.sqrt(d.value || 1));
            
        // 渲染节点
        const node = this.graphContainer.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(this.nodes)
            .enter().append("g")
            .attr("class", "node")
            .call(this.createDragBehavior());
            
        // 添加节点圆圈
        node.append("circle")
            .attr("r", this.options.nodeRadius)
            .attr("fill", d => this.getNodeColor(d.type || 'default'))
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);
            
        // 添加节点标签
        node.append("text")
            .text(d => d.label || d.name || d.id)
            .attr("dx", this.options.nodeRadius + 5)
            .attr("dy", ".35em")
            .style("font-size", "12px")
            .style("font-family", "Arial, sans-serif");
            
        // 添加节点悬停效果
        node.on("mouseover", (event, d) => {
            this.showNodeTooltip(event, d);
        }).on("mouseout", () => {
            this.hideNodeTooltip();
        });
        
        // 更新仿真
        this.simulation
            .nodes(this.nodes)
            .on("tick", () => {
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);
                    
                node
                    .attr("transform", d => `translate(${d.x},${d.y})`);
            });
            
        this.simulation.force("link")
            .links(this.links);
            
        // 重启仿真
        this.simulation.alpha(1).restart();
    }
    
    /**
     * 创建拖拽行为
     */
    createDragBehavior() {
        return d3.drag()
            .on("start", (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }
    
    /**
     * 获取节点颜色
     */
    getNodeColor(type) {
        const colors = {
            'project': '#ff6b6b',
            'task': '#4ecdc4',
            'person': '#45b7d1',
            'resource': '#96ceb4',
            'milestone': '#feca57',
            'default': '#95a5a6'
        };
        return colors[type] || colors.default;
    }
    
    /**
     * 显示节点提示信息
     */
    showNodeTooltip(event, node) {
        const tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");
            
        tooltip.html(`
            <strong>${node.label || node.name || node.id}</strong><br/>
            类型: ${node.type || '未知'}<br/>
            ${node.description ? `描述: ${node.description}` : ''}
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    }
    
    /**
     * 隐藏节点提示信息
     */
    hideNodeTooltip() {
        d3.selectAll(".d3-tooltip").remove();
    }
    
    /**
     * 显示错误信息
     */
    showError(message) {
        this.container.selectAll("*").remove();
        this.container.append("div")
            .style("text-align", "center")
            .style("padding", "50px")
            .style("color", "#e74c3c")
            .html(`
                <h3>⚠️ 关系图加载失败</h3>
                <p>${message}</p>
                <button onclick="window.d3RelationGraph.fetchAndRender()" 
                        style="padding: 8px 16px; margin-top: 10px; cursor: pointer;">
                    重新加载
                </button>
            `);
    }
    
    /**
     * 更新图形尺寸
     */
    resize(width, height) {
        this.options.width = width;
        this.options.height = height;
        
        this.svg
            .attr("width", width)
            .attr("height", height);
            
        this.simulation
            .force("center", d3.forceCenter(width / 2, height / 2))
            .restart();
    }
    
    /**
     * 清空图形
     */
    clear() {
        this.nodes = [];
        this.links = [];
        this.graphContainer.selectAll("*").remove();
        this.simulation.nodes([]).force("link").links([]);
    }
    
    /**
     * 销毁组件
     */
    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
        this.container.selectAll("*").remove();
        d3.selectAll(".d3-tooltip").remove();
    }
}

// 导出到全局作用域
window.D3RelationGraph = D3RelationGraph;

console.log('[D3关系图] 组件已加载');
