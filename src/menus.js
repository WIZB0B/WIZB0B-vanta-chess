// One controller for every popover, menu and dialog: only one is open at a time, and the
// open one closes on an outside pointer press, on Escape, or when another one opens.
// onChange(fn) hears each one opening and closing: fn(name, open) (the sounds of the
// interface and the music's muffle behind a dialog follow it).
export class MenuController{
  constructor(){this.items=new Map();this.current=null;this.listeners=new Set()}
  register(name,{open,close,contains=()=>false}){this.items.set(name,{open,close,contains});return this}
  onChange(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
  emit(name,open){for(const fn of this.listeners){try{fn(name,open)}catch{}}}
  isOpen(name){return this.current===name}
  open(name){
    const item=this.items.get(name);if(!item)return false;
    const again=this.current===name;
    if(this.current&&!again)this.close(this.current);
    this.current=name;item.open();if(!again)this.emit(name,true);return true;
  }
  toggle(name){return this.current===name?this.close(name):this.open(name)}
  close(name=this.current){
    if(!name)return false;
    const item=this.items.get(name);if(!item)return false;
    const was=this.current===name;
    if(was)this.current=null;
    item.close();if(was)this.emit(name,false);return true;
  }
  // Called when a surface closed itself (native dialog close, <details> toggle).
  closed(name){if(this.current===name){this.current=null;this.emit(name,false)}}
  handleOutside(target){
    if(!this.current)return false;
    if(this.items.get(this.current)?.contains(target))return false;
    return this.close();
  }
  handleEscape(){return this.close()}
}

export function backdropHit(event,element){
  if(event.target!==element)return false;
  const rect=element.getBoundingClientRect();
  return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;
}
