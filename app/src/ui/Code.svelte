<script lang="ts">
  import { highlight, plain, type Tok } from '../highlight'

  interface Props {
    lines: string[]
    lang: string
    focus?: [number, number]
    gutter?: boolean
    pickable?: boolean
    selected?: number
    marks?: Record<number, 'ok' | 'no'>
    onpick?: (line: number) => void
  }
  let { lines, lang, focus, gutter = true, pickable = false, selected, marks = {}, onpick }: Props = $props()

  let toks: Tok[][] = $state([])
  $effect(() => {
    const src = lines
    toks = plain(src)
    highlight(src, lang).then((t) => {
      if (src === lines) toks = t
    })
  })
</script>

<div class="code" class:pickable class:bare={!gutter}>
  <div class="code-in">
    {#each toks as line, i (i)}
      {@const n = i + 1}
      <div class="ln {marks[n] ?? ''}" class:focus={focus && n >= focus[0] && n <= focus[1]} class:sel={selected === n}>
        {#if gutter}
          {#if pickable}
            <button class="no" aria-label="Select line {n}" aria-pressed={selected === n} onclick={() => onpick?.(n)}
              >{n}</button
            >
          {:else}
            <span class="no">{n}</span>
          {/if}
        {/if}
        <span class="tx"
          >{#each line as t, j (j)}<span style={t.style}>{t.text}</span>{/each}</span
        >
      </div>
    {/each}
  </div>
</div>

<style>
  .code {
    --lh: 1.55;
    background: var(--surface);
    font: var(--fs) / var(--lh) var(--mono);
    font-variant-ligatures: none;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    padding-block: 8px;
  }
  .code.pickable {
    --lh: 2.1;
  }
  .code.bare {
    background: none;
    padding: 0;
    font-size: 12px;
    --lh: 1.5;
  }
  .code-in {
    min-width: max-content;
  }
  /* min-height keeps blank lines one row tall */
  .ln {
    display: flex;
    min-height: calc(var(--lh) * 1em);
    transition: background-color 0.12s;
  }
  .no {
    position: sticky;
    left: 0;
    flex: none;
    box-sizing: content-box;
    width: 3.4ch;
    padding: 0 1ch 0 6px;
    text-align: right;
    color: var(--c);
    background: var(--surface);
    user-select: none;
    font: inherit;
  }
  .pickable .no {
    width: 5ch;
    border-right: 1px solid var(--rule);
    margin-right: 1ch;
    color: var(--accent);
    cursor: pointer;
  }
  .tx {
    white-space: pre;
    padding-right: 12px;
    flex: 1;
  }
  .ln.focus,
  .ln.focus .no {
    background: color-mix(in srgb, var(--warn) 14%, var(--surface));
  }
  .ln.sel,
  .ln.sel .no {
    background: var(--accent-soft);
  }
  .ln.sel .no {
    font-weight: 600;
  }
  .ln.ok,
  .ln.ok .no {
    background: var(--good-soft);
  }
  .ln.no,
  .ln.no .no {
    background: var(--bad-soft);
  }
</style>
