// Registry 状态机：Idle -> Loading -> Ready / Error, 以及 Syncing
;(function(global){
  function StateMachine(){
    this.state = 'Idle'; // Idle | Loading | Ready | Syncing | Error
    this.error = null;
    this.listeners = new Set();
  }
  StateMachine.prototype.setState = function(next, meta){
    if (this.state === next && !meta) return;
    this.state = next;
    this.error = next === 'Error' ? (meta && meta.error) : null;
    this.emit();
  };
  StateMachine.prototype.onChange = function(fn){ this.listeners.add(fn); return ()=>this.listeners.delete(fn); };
  StateMachine.prototype.emit = function(){ this.listeners.forEach(fn=>{ try{ fn({ state:this.state, error:this.error }); }catch(e){} }); };
  global.RegistryStateMachine = StateMachine;
})(window || this);
