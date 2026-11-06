type Props = { label: string; value: number; min: number; max: number; onChange: (value:number)=>void };

/** Accessible, phone-sized controls while retaining a keyboard-editable number field. */
export default function SettingsNumberInput({label,value,min,max,onChange}:Props) {
  const update=(next:number)=>onChange(Math.max(min,Math.min(max,Math.floor(Number.isFinite(next)?next:min))));
  return <div className="settings-number-control">
    <button type="button" aria-label={`Decrease ${label}`} disabled={value<=min} onClick={()=>update(value-1)}><span className="number-control-glyph" aria-hidden="true"><b>−</b></span></button>
    <input type="number" inputMode="numeric" aria-label={label} min={min} max={max} step="1" value={value} onChange={event=>update(Number(event.target.value))}/>
    <button type="button" aria-label={`Increase ${label}`} disabled={value>=max} onClick={()=>update(value+1)}><span className="number-control-glyph" aria-hidden="true"><b>+</b></span></button>
  </div>;
}
