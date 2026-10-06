const focusableSelector='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function vchDialog({title,body,actions=[],dismissible=true}){
  return new Promise(resolve=>{
    const previous=document.activeElement,layer=document.createElement('div'),panel=document.createElement('section');
    layer.className='vch-dialog-layer';layer.setAttribute('aria-hidden','true');
    panel.className='vch-dialog-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.tabIndex=-1;
    const headingId=`vch-dialog-${crypto.randomUUID()}`;panel.setAttribute('aria-labelledby',headingId);
    const head=document.createElement('header'),heading=document.createElement('h2'),close=document.createElement('button');
    heading.id=headingId;heading.textContent=String(title||'VCH');
    close.type='button';close.className='vch-dialog-close';close.setAttribute('aria-label','Close');close.textContent='×';
    head.append(heading);if(dismissible)head.append(close);panel.append(head);
    const content=document.createElement('div');content.className='vch-dialog-body';
    if(body instanceof Node)content.append(body);else content.textContent=String(body??'');
    panel.append(content);
    const footer=document.createElement('footer');footer.className='vch-dialog-actions';
    let settled=false;
    const finish=value=>{
      if(settled)return;settled=true;layer.classList.add('closing');layer.classList.remove('open');layer.setAttribute('aria-hidden','true');
      const delay=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?0:180;
      setTimeout(()=>{layer.remove();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();resolve(value)},delay);
    };
    for(const action of actions){
      const button=document.createElement('button');button.type='button';button.className=`vch-dialog-action ${action.primary?'primary':'secondary'}`;
      button.textContent=String(action.label||action.id||'OK');button.disabled=!!action.disabled;
      button.addEventListener('click',()=>finish(Object.prototype.hasOwnProperty.call(action,'value')?action.value:(action.id??action.label)));
      footer.append(button);
    }
    panel.append(footer);layer.append(panel);document.body.append(layer);
    const focusables=()=>[...panel.querySelectorAll(focusableSelector)].filter(el=>!el.disabled&&el.getAttribute('aria-hidden')!=='true');
    layer.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&dismissible){event.preventDefault();finish(null);return}
      if(event.key!=='Tab')return;
      const items=focusables();if(!items.length){event.preventDefault();panel.focus();return}
      const first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    });
    layer.addEventListener('mousedown',event=>{if(dismissible&&event.target===layer)finish(null)});
    close.addEventListener('click',()=>finish(null));
    requestAnimationFrame(()=>{layer.classList.add('open');layer.setAttribute('aria-hidden','false');(focusables()[0]||panel).focus()});
  });
}
