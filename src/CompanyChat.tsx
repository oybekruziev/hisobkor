import React, {useEffect, useRef, useState} from 'react';
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription} from './components/ui/sheet';
import {Button} from './components/ui/button';
import {Textarea} from './components/ui/textarea';
import {Spinner} from './components/ui/spinner';
import {Character} from './components/Character';
import {AiConsent} from './components/app/AiConsent';
import {Icon} from './Icon';
import {cn} from './lib/utils';
import {request, storageMode} from './storage';

type Msg = {role: 'user' | 'assistant'; text: string; result?: any; error?: string};
const samples = ['Qaysi hujjatlarda ziddiyat bor?', 'Hisob-fakturalar bo‘yicha jami summa qancha?', 'Shartnomasi yetishmayotgan hujjatlar bormi?'];

/**
 * Chat about one company's documents. The server builds the context from this company's analysed
 * files only; answers cite documents, and "not enough evidence" is a valid answer. The chat never
 * changes documents, reports or settings — suggestions are shown for the accountant to act on.
 */
export function CompanyChat({open, onOpenChange, company, docs, state, connected, consent, setConsent, onOpenDocument, onAsked}: any) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  // A different company never inherits the previous conversation.
  useEffect(() => { setMessages([]); setText(''); }, [company?.id]);
  useEffect(() => { end.current?.scrollIntoView({block: 'end'}); }, [messages.length, busy]);
  const analysed = docs.filter((d: any) => d.company === company.id && d.ai?.status === 'complete').length;
  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const history = messages.filter(m => !m.error).map(m => ({role: m.role, text: m.role === 'assistant' ? (m.result?.answer || '') : m.text}));
    setMessages(m => [...m, {role: 'user', text: q}]);
    setText(''); setBusy(true);
    onAsked?.(q);
    try {
      const body: any = {companyId: company.id, question: q, history};
      if (storageMode() === 'browser') body.state = state;
      const response = await request('/api/chat', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
      const {result} = await response.json();
      setMessages(m => [...m, {role: 'assistant', text: result.answer, result}]);
    } catch (e: any) {
      setMessages(m => [...m, {role: 'assistant', text: '', error: e.message || 'Javob olinmadi.'}]);
    } finally { setBusy(false); }
  }
  const title = (id: string) => docs.find((d: any) => d.id === id)?.title || 'Hujjat';
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
      <SheetHeader className="border-b">
        <SheetTitle className="flex items-center gap-2"><Icon name="spark" className="text-primary"/>{company.name} bo‘yicha savol</SheetTitle>
        <SheetDescription>Javob faqat shu kompaniyaning tahlil qilingan {analysed} ta hujjatiga tayanadi va manbani ko‘rsatadi. AI xato qilishi mumkin — qarorni siz berasiz.</SheetDescription>
      </SheetHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4" aria-live="polite">
        {!connected ? <p className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">AI xizmati hozir ulanmagan. Hujjatlarni qo‘lda ko‘rib chiqishingiz mumkin.</p>
          : !consent ? <AiConsent checked={false} onCheckedChange={setConsent} offHint="Chat ishlashi uchun AI tahliliga ruxsat kerak."/>
          : messages.length === 0 && <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Character pose="help" width={104}/>
            <p className="text-sm font-medium">Masalan, so‘rang:</p>
            <div className="flex flex-col gap-2">{samples.map(s => <Button key={s} variant="outline" size="sm" className="h-auto justify-start py-2 text-left whitespace-normal" onClick={() => ask(s)}>{s}</Button>)}</div>
            {analysed === 0 && <p className="text-sm text-pretty text-warning-ink">Bu kompaniyada hali tahlil qilingan hujjat yo‘q — javob «yetarli dalil yo‘q» bo‘ladi. Avval hujjatlarni tekshiring.</p>}
          </div>}
        {messages.map((m, i) => m.role === 'user'
          ? <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground [overflow-wrap:anywhere]">{m.text}</div>
          : m.error ? <p key={i} role="alert" className="max-w-[90%] rounded-2xl rounded-bl-md border border-danger/25 bg-danger/5 px-3.5 py-2 text-sm text-danger">{m.error}</p>
          : <div key={i} className={cn('max-w-[92%] rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-sm', m.result?.insufficient ? 'border-warning/40 bg-warning/5' : 'bg-card')}>
            {m.result?.insufficient && <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-warning-ink"><Icon name="alert" size={14}/>Yetarli dalil yo‘q yoki manba ko‘rsatilmagan</p>}
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.text}</p>
            {m.result?.sources?.length > 0 && <ul className="mt-2 flex flex-col gap-1.5 border-t pt-2">{m.result.sources.map((s: any, j: number) => <li key={j}>
              <button type="button" onClick={() => onOpenDocument(s.documentId)} className="w-full rounded-md p-1.5 text-left outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary"><Icon name="document" size={13}/>{title(s.documentId)}{s.location ? ` · ${s.location}` : ''}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground italic [overflow-wrap:anywhere]">«{s.quote}»</span>
              </button></li>)}</ul>}
            {m.result?.suggestion && <p className="mt-2 rounded-md bg-accent px-2 py-1.5 text-xs text-accent-foreground"><span className="font-semibold">Taklif (avtomatik bajarilmaydi): </span>{m.result.suggestion}</p>}
          </div>)}
        {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner/>Javob tayyorlanmoqda…</p>}
        <div ref={end}/>
      </div>
      <form className="flex items-end gap-2 border-t p-3" onSubmit={e => { e.preventDefault(); ask(text); }}>
        <Textarea aria-label="Savol" rows={2} maxLength={1000} value={text} disabled={!connected || !consent || busy} placeholder="Bu raqam qayerdan? Nima yetishmayapti?" onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(text); } }} className="min-h-11 resize-none"/>
        <Button type="submit" size="icon" className="size-11 shrink-0" disabled={!text.trim() || busy || !connected || !consent} aria-label="Yuborish"><Icon name="arrow"/></Button>
      </form>
    </SheetContent>
  </Sheet>;
}
