import { Check, Minus } from 'lucide-react';
import type { ChangeEventHandler } from 'react';

type Props={checked:boolean;onChange:ChangeEventHandler<HTMLInputElement>;label?:string};
/** Native checkbox with a decorative angular check or dash. */
export default function SettingCheckbox({checked,onChange,label}:Props){
  return <span className="setting-check"><input type="checkbox" aria-label={label} checked={checked} onChange={onChange}/><span className="setting-check-visual" aria-hidden="true"><Check className="setting-check-on" size={18}/><Minus className="setting-check-off" size={18}/></span></span>;
}
