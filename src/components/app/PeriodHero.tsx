import {ArrowRight, CheckCheck, ClipboardCheck, Clock, Upload} from 'lucide-react';
import {Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction} from '../ui/card';
import {Progress} from '../ui/progress';
import {Button} from '../ui/button';
import {IconTile} from './Tiles';
import {formatPeriod} from '../../format.mjs';

const icons: Record<string, any> = {review: ClipboardCheck, waiting: Clock, ready: CheckCheck, closed: CheckCheck, empty: Upload};

/**
 * The first thing a company page says: what this period needs, how far it is,
 * and one button that does the obvious next thing. Content comes from `periodSummary`.
 */
export function PeriodHero({summary, period, onAction}: any) {
  const {state, tone, title, text, progress, action} = summary;
  return (
    <Card>
      <CardHeader>
        <CardDescription>{formatPeriod(period)} · hisobot davri</CardDescription>
        <CardTitle className="text-xl text-balance">{title}</CardTitle>
        <CardAction><IconTile icon={icons[state] || Clock} tone={tone} size="lg"/></CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 lg:flex-row lg:items-end lg:gap-8">
        <p className="flex-1 text-sm text-pretty text-muted-foreground">{text}</p>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 text-sm text-muted-foreground">
            <span>Qabul qilingan</span>
            <span className="font-medium text-foreground tabular-nums">{progress.done} / {progress.total}</span>
          </div>
          <Progress value={progress.percent} aria-label={`${progress.total} tadan ${progress.done} ta hujjat qabul qilingan`}/>
        </div>
        <Button className="max-lg:w-full" onClick={() => onAction(action)}>{action.label}<ArrowRight/></Button>
      </CardContent>
    </Card>
  );
}
