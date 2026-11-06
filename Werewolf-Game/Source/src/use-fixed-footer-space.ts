import {useLayoutEffect,type RefObject} from 'react';

/** Reserve actual footer height, including wrapped text and safe-area padding. */
export function useFixedFooterSpace(ref:RefObject<HTMLElement|null>,active=true,layoutKey:unknown=null){
  useLayoutEffect(()=>{
    const footer=ref.current,parent=footer?.parentElement;
    if(!active || !footer || !parent)return;
    let alive=true;
    const measure=()=>{const height=footer.getBoundingClientRect().height;if(alive && height>0)parent.style.setProperty('--fixed-footer-space',`${Math.ceil(height)}px`);};
    measure();
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;
    observer?.observe(footer);window.addEventListener('resize',measure);
    void document.fonts?.ready.then(measure);
    return ()=>{alive=false;observer?.disconnect();window.removeEventListener('resize',measure);parent.style.removeProperty('--fixed-footer-space');};
  },[ref,active,layoutKey]);
}
