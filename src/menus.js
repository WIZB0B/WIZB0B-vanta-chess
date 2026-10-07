// One controller for every popover, menu and dialog: only one is open at a time, and the
// open one closes on an outside pointer press, on Escape, or when another one opens.
export class MenuController{
  constructor(){this.items=new Map();this.current=null}
  register(name,{open,close,contains=()=>false}){this.items.set(name,{open,close,contains});return this}
  isOpen(name){return this.current===name}
  open(name){
    const item=this.items.get(name);if(!item)return false;
    if(this.current&&this.current!==name)this.close(this.current);
    this.current=name;item.open();return true;
  }
  toggle(name){return this.current===name?this.close(name):this.open(name)}
  close(name=this.current){
    if(!name)return false;
    const item=this.items.get(name);if(!item)return false;
    if(this.current===name)this.current=null;
    item.close();return true;
  }
  // Called when a surface closed itself (native dialog close, <details> toggle).
  closed(name){if(this.current===name)this.current=null}
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
