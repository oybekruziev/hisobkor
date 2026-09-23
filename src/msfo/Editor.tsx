import React,{forwardRef,useCallback,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {Button} from '../components/ui/button';
import {Separator} from '../components/ui/separator';
import {NativeSelect,NativeSelectOption} from '../components/ui/native-select';
import {Tooltip,TooltipContent,TooltipTrigger} from '../components/ui/tooltip';
import {Icon} from '../Icon';
import {cn} from '../lib/utils';
import {sanitizeHtml} from './html';

export type EditorHandle={getHtml:()=>string;setHtml:(html:string)=>void;getSelectionHtml:()=>string;replaceSelection:(html:string)=>boolean;findNext:(needles:string[])=>boolean;focus:()=>void};

/** Word-like page typography. Shared by the editable page and the read-only source view. */
export const pageClass='mx-auto w-full max-w-[816px] bg-background font-serif text-[15px] leading-7 text-foreground shadow-sm ring-1 ring-border outline-none sm:min-h-[1056px] px-5 py-6 sm:px-16 sm:py-14 [overflow-wrap:break-word] [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1:first-child]:mt-0 [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:leading-snug [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_table]:leading-5 [&_th]:border [&_th]:border-zinc-400 [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:align-top [&_th]:font-semibold [&_td]:border [&_td]:border-zinc-400 [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top [&_td]:tabular-nums';

const blockOptions=[['p','Oddiy matn'],['h1','Sarlavha 1'],['h2','Sarlavha 2'],['h3','Sarlavha 3']];

function ToolButton({label,icon,onClick,active,disabled,shortcut}:{label:string;icon:string;onClick:()=>void;active?:boolean;disabled?:boolean;shortcut?:string}){
 return <Tooltip><TooltipTrigger asChild><Button data-slot="button" type="button" variant="ghost" size="icon" className={cn('size-8',active&&'bg-accent text-accent-foreground')} aria-label={label} aria-pressed={active===undefined?undefined:active} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={onClick}><Icon name={icon} size={16}/></Button></TooltipTrigger><TooltipContent>{label}{shortcut&&<span className="ml-2 opacity-70">{shortcut}</span>}</TooltipContent></Tooltip>;
}

const emptyCell=(tag:'td'|'th')=>{const c=document.createElement(tag);c.appendChild(document.createElement('br'));return c;};

/**
 * contentEditable page with a compact ribbon. Uncontrolled: the parent reads/writes through the handle,
 * and every HTML that enters (initial, paste, AI) goes through sanitizeHtml.
 */
export const DocumentEditor=forwardRef<EditorHandle,{initialHtml:string;onChange:()=>void;onSelection?:(hasSelection:boolean)=>void;readOnly?:boolean;label:string}>(function DocumentEditor({initialHtml,onChange,onSelection,readOnly,label},ref){
 const page=useRef<HTMLDivElement>(null);
 const saved=useRef<Range|null>(null);
 const [state,setState]=useState({b:false,i:false,u:false,block:'p',align:'left',inTable:false,ol:false,ul:false});
 useEffect(()=>{if(page.current)page.current.innerHTML=sanitizeHtml(initialHtml)||'<p><br></p>'},[]);// eslint-disable-line react-hooks/exhaustive-deps
 const inside=(node:Node|null)=>!!node&&!!page.current&&page.current.contains(node);
 const restore=()=>{const sel=getSelection();if(saved.current&&sel&&!inside(sel.anchorNode)){sel.removeAllRanges();sel.addRange(saved.current)}if(!inside(getSelection()?.anchorNode||null))page.current?.focus()};
 const refresh=useCallback(()=>{
  const sel=getSelection();if(!sel||!sel.rangeCount||!inside(sel.anchorNode))return;
  saved.current=sel.getRangeAt(0).cloneRange();
  const el=(sel.anchorNode?.nodeType===1?sel.anchorNode:sel.anchorNode?.parentElement) as HTMLElement|null;
  const blockEl=el?.closest('h1,h2,h3,p,li,td,th') as HTMLElement|null;
  const q=(c:string)=>{try{return document.queryCommandState(c)}catch{return false}};
  setState({b:q('bold'),i:q('italic'),u:q('underline'),block:blockEl&&/^H[123]$/.test(blockEl.tagName)?blockEl.tagName.toLowerCase():'p',align:(blockEl?.style.textAlign||'left'),inTable:!!el?.closest('td,th'),ol:!!el?.closest('ol'),ul:!!el?.closest('ul')});
  onSelection?.(!sel.isCollapsed&&sel.toString().trim().length>0);
 },[onSelection]);
 useEffect(()=>{document.addEventListener('selectionchange',refresh);return()=>document.removeEventListener('selectionchange',refresh)},[refresh]);
 const exec=(command:string,value?:string)=>{restore();try{document.execCommand('styleWithCSS',false,'false')}catch{};document.execCommand(command,false,value);refresh();onChange();};
 const cell=()=>{const sel=getSelection();const n=sel?.anchorNode;const el=(n?.nodeType===1?n:n?.parentElement) as HTMLElement|null;return inside(el)?el?.closest('td,th') as HTMLTableCellElement|null:null};
 function tableOp(op:'row'|'col'|'delRow'|'delCol'){
  restore();const c=cell();if(!c)return;const row=c.parentElement as HTMLTableRowElement;const table=c.closest('table')!;const index=c.cellIndex;
  if(op==='row'){const r=document.createElement('tr');for(let i=0;i<row.cells.length;i++)r.appendChild(emptyCell('td'));(row.parentElement?.tagName==='THEAD'?table.tBodies[0]||table.createTBody():row.parentElement!).insertBefore(r,row.parentElement?.tagName==='THEAD'?(table.tBodies[0]?.firstChild||null):row.nextSibling);}
  if(op==='col')for(const r of Array.from(table.rows))r.insertBefore(emptyCell(r.parentElement?.tagName==='THEAD'?'th':'td'),r.cells[index+1]||null);
  if(op==='delRow'){row.remove();if(!table.rows.length)table.remove();}
  if(op==='delCol'){for(const r of Array.from(table.rows))r.cells[index]?.remove();if(!table.rows[0]?.cells.length)table.remove();}
  onChange();refresh();
 }
 function insertTable(){exec('insertHTML','<table><thead><tr><th>Modda</th><th>Izoh</th><th>Hisobot davri</th><th>O‘tgan davr</th></tr></thead><tbody><tr><td><br></td><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td><td><br></td><td><br></td></tr></tbody></table><p><br></p>')}
 useImperativeHandle(ref,()=>({
  getHtml:()=>sanitizeHtml(page.current?.innerHTML||''),
  setHtml:(html:string)=>{if(page.current){page.current.innerHTML=sanitizeHtml(html)||'<p><br></p>';saved.current=null;}},
  getSelectionHtml:()=>{const r=saved.current;if(!r||r.collapsed)return '';const box=document.createElement('div');box.appendChild(r.cloneContents());return sanitizeHtml(box.innerHTML)},
  replaceSelection:(html:string)=>{if(!saved.current||saved.current.collapsed)return false;restore();document.execCommand('insertHTML',false,sanitizeHtml(html));onChange();return true},
  findNext:(needles:string[])=>{
   const root=page.current;if(!root)return false;
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const hits:Range[]=[];
   while(walker.nextNode()){const n=walker.currentNode as Text;const text=n.nodeValue||'';for(const needle of needles){let at=text.indexOf(needle);while(at>=0){const close=text.indexOf(']',at);const r=document.createRange();r.setStart(n,at);r.setEnd(n,close>at?close+1:at+needle.length);hits.push(r);at=text.indexOf(needle,at+1);}}}
   if(!hits.length)return false;
   hits.sort((x,y)=>x.compareBoundaryPoints(Range.START_TO_START,y));
   const from=saved.current&&inside(saved.current.endContainer)?saved.current:null;
   const next=(from&&hits.find(h=>h.compareBoundaryPoints(Range.START_TO_START,from)>0))||hits[0];
   const sel=getSelection();sel?.removeAllRanges();sel?.addRange(next);saved.current=next.cloneRange();
   (next.startContainer.parentElement as HTMLElement)?.scrollIntoView({block:'center',behavior:'smooth'});
   return true;
  },
  focus:()=>page.current?.focus(),
 }));
 function onPaste(e:React.ClipboardEvent){
  e.preventDefault();const html=e.clipboardData.getData('text/html');const text=e.clipboardData.getData('text/plain');
  if(html)document.execCommand('insertHTML',false,sanitizeHtml(html));
  else document.execCommand('insertText',false,text);
  onChange();
 }
 function onKeyDown(e:React.KeyboardEvent){
  if(e.key==='Tab'){const c=cell();if(c){e.preventDefault();const cells=Array.from(c.closest('table')!.querySelectorAll('td,th'));const next=cells[cells.indexOf(c)+(e.shiftKey?-1:1)];if(next){const r=document.createRange();r.selectNodeContents(next);r.collapse(false);getSelection()?.removeAllRanges();getSelection()?.addRange(r);}}}
 }
 return <div className="flex min-w-0 flex-col">
  {!readOnly&&<div role="toolbar" aria-label="Formatlash" className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border bg-background/95 p-1 backdrop-blur">
   <ToolButton label="Bekor qilish" shortcut="Ctrl+Z" icon="undo" onClick={()=>exec('undo')}/>
   <ToolButton label="Qaytarish" shortcut="Ctrl+Y" icon="redo" onClick={()=>exec('redo')}/>
   <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5"/>
   <NativeSelect aria-label="Matn uslubi" size="sm" className="w-36" value={state.block} onChange={e=>exec('formatBlock',e.target.value)}>{blockOptions.map(([v,l])=><NativeSelectOption key={v} value={v}>{l}</NativeSelectOption>)}</NativeSelect>
   <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5"/>
   <ToolButton label="Qalin" shortcut="Ctrl+B" icon="bold" active={state.b} onClick={()=>exec('bold')}/>
   <ToolButton label="Kursiv" shortcut="Ctrl+I" icon="italic" active={state.i} onClick={()=>exec('italic')}/>
   <ToolButton label="Tagiga chizilgan" shortcut="Ctrl+U" icon="underline" active={state.u} onClick={()=>exec('underline')}/>
   <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5"/>
   <ToolButton label="Chapga" icon="alignLeft" active={state.align==='left'||state.align==='start'} onClick={()=>exec('justifyLeft')}/>
   <ToolButton label="Markazga" icon="alignCenter" active={state.align==='center'} onClick={()=>exec('justifyCenter')}/>
   <ToolButton label="O‘ngga" icon="alignRight" active={state.align==='right'} onClick={()=>exec('justifyRight')}/>
   <ToolButton label="Ikki tomonga" icon="alignJustify" active={state.align==='justify'} onClick={()=>exec('justifyFull')}/>
   <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5"/>
   <ToolButton label="Belgili ro‘yxat" icon="list" active={state.ul} onClick={()=>exec('insertUnorderedList')}/>
   <ToolButton label="Raqamli ro‘yxat" icon="listOrdered" active={state.ol} onClick={()=>exec('insertOrderedList')}/>
   <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5"/>
   <ToolButton label="Jadval qo‘yish" icon="table" onClick={insertTable}/>
   <ToolButton label="Qator qo‘shish" icon="rows" disabled={!state.inTable} onClick={()=>tableOp('row')}/>
   <ToolButton label="Ustun qo‘shish" icon="columns" disabled={!state.inTable} onClick={()=>tableOp('col')}/>
   <ToolButton label="Qatorni o‘chirish" icon="trash" disabled={!state.inTable} onClick={()=>tableOp('delRow')}/>
   <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5"/>
   <ToolButton label="Formatni tozalash" icon="clear" onClick={()=>exec('removeFormat')}/>
  </div>}
  <div className={cn('overflow-x-auto bg-muted/50 py-4 sm:p-8',readOnly?'rounded-lg border':'rounded-b-lg border border-t-0')}>
   <div ref={page} role="textbox" aria-multiline="true" aria-label={label} aria-readonly={readOnly||undefined} contentEditable={!readOnly} suppressContentEditableWarning spellCheck={false} className={cn(pageClass,'focus-visible:ring-2 focus-visible:ring-ring/50')} onInput={onChange} onPaste={onPaste} onKeyDown={onKeyDown}/>
  </div>
 </div>;
});
