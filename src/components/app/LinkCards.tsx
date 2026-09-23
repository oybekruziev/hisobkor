import type {ComponentType} from 'react';
import {ChevronRight} from 'lucide-react';
import {Card} from '../ui/card';
import {IconTile} from './Tiles';

export type LinkCard = {key: string; title: string; description: string; icon: ComponentType<any>; onSelect: () => void};

/** Small destination cards: icon chip, title, one line of what lives there. */
export function LinkCards({items}: {items: LinkCard[]}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(item => (
        <button key={item.key} type="button" className="group/link rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={item.onSelect}>
          <Card className="flex-row items-center gap-3 px-4 py-4 transition-shadow group-hover/link:shadow-md">
            <IconTile icon={item.icon} tone="accent"/>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="truncate text-sm text-muted-foreground">{item.description}</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground"/>
          </Card>
        </button>
      ))}
    </div>
  );
}
