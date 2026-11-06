import {useEffect,useRef,type RefObject} from 'react';

/** Native inertness plus explicit Tab boundaries, without storing any screen content. */
export function useModalDialog(ref:RefObject<HTMLDialogElement|null>,active=true,focusKey:unknown=null){
  const opener=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    const element=ref.current;if(!active || !element){opener.current=null;return;}
    if(!element.open){opener.current=document.activeElement as HTMLElement|null;element.showModal();}
    const tab=(event:KeyboardEvent)=>{
      if(event.key!=='Tab' || element.querySelector('dialog[open]'))return;
      const controls=[...element.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],summary,[tabindex]')]
        .filter(el=>el.tabIndex>=0 && !el.matches(':disabled,input[type="hidden"]') && !el.closest('[hidden],[inert]') && el.getClientRects().length>0);
      const first=controls[0],last=controls[controls.length-1];
      if(!first){event.preventDefault();element.focus();}
      else if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    };
    element.addEventListener('keydown',tab);
    return ()=>{
      element.removeEventListener('keydown',tab);
      // Removing a native dialog removes it from the top layer. Do not call close()
      // here: a queued close event during StrictMode cleanup could close a new view.
      if(opener.current?.isConnected)opener.current.focus({preventScroll:true});
    };
  },[ref,active]);
  useEffect(()=>{
    if(active)ref.current?.querySelector<HTMLElement>('button:not(:disabled),input:not([type="hidden"]):not(:disabled),[tabindex="0"]')?.focus({preventScroll:true});
  },[ref,active,focusKey]);
}
