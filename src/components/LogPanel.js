/**
 * 日志面板JavaScript模块 - 独立文件
 * 从原index.html中提取
 * 
 * 使用方法：
 * 1. 在HTML中添加日志面板HTML结构
 * 2. 引入此脚本: <script src="src/components/LogPanel.js"></script>
 * 3. 使用: window.LogPanel.log('消息')
 * 
 * API:
 * - LogPanel.log(message) - 普通日志
 * - LogPanel.warn(message) - 警告日志
 * - LogPanel.error(message) - 错误日志
 * - LogPanel.json(title, object) - JSON对象日志
 * 
 * 功能：
 * - 自动拦截console.log/warn/error输出
 * - 全局错误捕获
 * - 折叠/展开面板
 * - 清空日志
 * - 复制日志到剪贴板
 */

(function(){
    'use strict';
    
    const pad = n => (n<10? '0':'') + n;
    
    function ts(){ 
        const d=new Date(); 
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; 
    }
    
    function ensureInit(){
        const panel = document.getElementById('list-log-panel');
        const header = document.getElementById('list-log-header');
        const caret = document.getElementById('list-log-caret');
        const body = document.getElementById('list-log-body');
        const btnClear = document.getElementById('list-log-clear');
        const btnCopy = document.getElementById('list-log-copy');
        
        if (!panel || !header || !body) return false;
        
        if (!header.__bound){
            header.__bound = true;
            header.addEventListener('click', function(){
                const collapsed = panel.getAttribute('data-collapsed') !== 'false';
                if (collapsed){
                    panel.setAttribute('data-collapsed','false');
                    body.style.display = 'block';
                    caret.textContent = '▾';
                } else {
                    panel.setAttribute('data-collapsed','true');
                    body.style.display = 'none';
                    caret.textContent = '▸';
                }
            });
        }
        
        btnClear && !btnClear.__bound && (btnClear.__bound = true, btnClear.addEventListener('click', ()=>{ 
            body.textContent=''; 
        }));
        
        btnCopy  && !btnCopy.__bound  && (btnCopy.__bound  = true, btnCopy.addEventListener('click', ()=>{ 
            try{ 
                navigator.clipboard.writeText(body.textContent||''); 
                alert('日志已复制'); 
            }catch(_){ 
                console.error('复制日志失败'); 
            } 
        }));
        
        return true;
    }
    
    function append(level, message){
        if (!ensureInit()) return;
        const body = document.getElementById('list-log-body');
        const line = `[${ts()}][${level}] ${message}`;
        body.textContent += (body.textContent ? "\n" : "") + line;
        body.scrollTop = body.scrollHeight;
    }
    
    const LogPanel = {
        log: (m)=>append('INFO', String(m)),
        warn: (m)=>append('WARN', String(m)),
        error: (m)=>append('ERROR', String(m)),
        json: (title, obj)=>append('INFO', `${title}: ${(()=>{
            try{
                return JSON.stringify(obj, null, 2)
            }catch(_){
                return String(obj)
            }
        })()}`)
    };
    
    // 导出到全局
    window.LogPanel = LogPanel;
    
    // Tee console 输出到日志面板
    ['log','info','warn','error'].forEach(fn=>{
        const orig = console[fn].bind(console);
        console[fn] = function(){ 
            try{ 
                LogPanel[fn==='info'?'log':fn]([].map.call(arguments, x=> (typeof x==='object'? JSON.stringify(x): String(x))).join(' ')); 
            }catch(_){
                // 忽略日志面板错误，不影响原console输出
            }
            return orig.apply(console, arguments); 
        };
    });
    
    // 全局错误捕获
    window.addEventListener('error', e=>{ 
        LogPanel.error(`WindowError: ${e.message}`); 
    });
    
    window.addEventListener('unhandledrejection', e=>{ 
        LogPanel.error(`UnhandledRejection: ${e.reason && e.reason.message ? e.reason.message : String(e.reason)}`); 
    });
    
    // 初始化提示
    setTimeout(()=> {
        LogPanel.log('日志面板已初始化');
    }, 0);
    
    console.log('[LogPanel] ✅ 日志面板模块加载完成');
})();
