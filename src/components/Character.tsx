import {cn} from '../lib/utils';

/**
 * The approved Hisobkor notebook character (brief 2026-09-24, §3.1). Static images only — never a
 * status or a CTA on their own: always render them next to the words and the action they illustrate.
 */
export type Pose = 'welcome' | 'invite' | 'thinking' | 'review' | 'help' | 'complete';
/** Height ÷ width of each trimmed pose, so the <img> reserves its box before it loads (no layout shift). */
const ratio: Record<Pose, number> = {welcome: 1216 / 1139, invite: 1277 / 1151, thinking: 1277 / 1089, review: 1267 / 1147, help: 1296 / 1109, complete: 1296 / 1117};

export function Character({pose, width, alt = '', eager = false, className}: {pose: Pose; width: number; alt?: string; eager?: boolean; className?: string}) {
  const src = (w: number) => `/brand/character-${pose}-${w}.webp`;
  return <img src={src(width > 160 ? 320 : 160)} srcSet={`${src(160)} 160w, ${src(320)} 320w, ${src(640)} 640w`} sizes={`${width}px`}
    width={width} height={Math.round(width * ratio[pose])} alt={alt} aria-hidden={alt ? undefined : true}
    loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async"
    className={cn('pointer-events-none h-auto shrink-0 select-none', className)} style={{width, maxWidth: '100%'}}/>;
}

/** App icon: the character's head (raster) for 28–36 px; the flat vector mark is the favicon. */
export function BrandMark({size = 32, className}: {size?: number; className?: string}) {
  return <img src="/brand/icon-72.webp" srcSet="/brand/icon-72.webp 1x, /brand/icon-144.webp 2x" width={size} height={size} alt="" aria-hidden="true" className={cn('shrink-0 object-contain', className)}/>;
}

/** Icon + word mark. The product name is "Hisobkor"; the domain is secondary. */
export function Wordmark({size = 32, className, muted = 'text-muted-foreground'}: {size?: number; className?: string; muted?: string}) {
  return <span className={cn('flex items-center gap-2', className)}><BrandMark size={size}/><span className="text-[1.0625rem] font-semibold tracking-tight">Hisobkor<span className={cn('font-normal', muted)}>.uz</span></span></span>;
}
