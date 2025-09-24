// Command Bus：统一的写侧命令入口，驱动 Repository / Store / StateMachine
;(function(global){
  function CommandBus(opts){
    this.store = opts.store;
    this.repo = opts.repo;
    this.bus = opts.bus;
    this.fsm = opts.fsm;
  }
  CommandBus.prototype.init = async function(){
    try{
      this.fsm.setState('Loading');
      await this.repo.refresh();
      this.fsm.setState('Ready');
    }catch(e){
      console.error('[CommandBus] 初始化失败', e);
      this.fsm.setState('Error', { error:e });
    }
  };
  CommandBus.prototype.refresh = async function(){
    try{
      this.fsm.setState('Syncing');
      await this.repo.refresh();
      this.fsm.setState('Ready');
    }catch(e){ this.fsm.setState('Error', { error:e }); }
  };
  CommandBus.prototype.select = function(id){
    this.store.setCurrentId(id);
    this.bus && this.bus.emit('project:selected', { id:id });
  };
  CommandBus.prototype.setSortMode = function(mode){
    this.store.setSortMode(mode);
    this.bus && this.bus.emit('registry:sorted', { mode:mode });
  };
  CommandBus.prototype.register = async function(project){
    await this.repo.register(project);
    this.bus && this.bus.emit('project:registered', { id: project.id || project.project_id });
  };
  CommandBus.prototype.rename = async function(id, name){
    await this.repo.rename(id, name);
  };
  CommandBus.prototype.remove = async function(id){
    await this.repo.remove(id);
    if (this.store.state.currentId === id){ this.store.setCurrentId(null); }
  };
  global.CommandBus = CommandBus;
  global.RegistryCommandBus = CommandBus; // 向后兼容
})(window || this);
