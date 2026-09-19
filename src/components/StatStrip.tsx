import {cn} from '../lib/utils';

type Metric = {label: string; value: string | number; hint?: string; tone?: string};
export function StatStrip({items, className}: {items: Metric[]; className?: string}) {
  return <div className={cn('stat-container', className)}>
    <dl className="stat-strip">
      {items.map(item => <div key={item.label} data-tone={item.tone}>
        <dt title={item.label}>{item.label}</dt>
        <dd><strong>{item.value}</strong>{item.hint && <p>{item.hint}</p>}</dd>
      </div>)}
    </dl>
  </div>;
}
