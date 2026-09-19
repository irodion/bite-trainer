<script lang="ts">
  import type { SessionItem } from '../core/session'
  import { shuffled } from '../core/shuffle'
  import type { PackManifest } from '../core/types'
  import { leaveSession, nextExercise, recordAttempt } from '../state.svelte'
  import Code from './Code.svelte'
  import Prose from './Prose.svelte'

  interface Props {
    item: SessionItem
    manifest: PackManifest
    sessionId: string
    index: number
    total: number
    last: boolean
  }
  let { item, manifest, sessionId, index, total, last }: Props = $props()
  const ex = $derived(item.exercise)
  const lang = $derived(manifest.language.highlight)
  // Options are presented in a fresh random order every time, so position never gives the answer away.
  // Letters follow the display position; the Progress Log records the option id.
  const options = $derived(ex.type === 'choice' ? shuffled(ex.options) : [])

  let choice: string | undefined = $state()
  let line: number | undefined = $state()
  let done = $state(false)
  let correct = $state(false)
  let sheet = $state(false)
  let primerOpen = $state(false)
  let toast = $state('')
  const open = $derived(sheet || done)

  // Time Budget clock: counts only while the page is visible.
  let elapsedMs = $state(0)
  $effect(() => {
    if (done) return
    let last = performance.now()
    const tick = setInterval(() => {
      const now = performance.now()
      if (document.visibilityState === 'visible') elapsedMs += now - last
      last = now
    }, 500)
    return () => clearInterval(tick)
  })
  const overS = $derived(elapsedMs / 1000 - ex.timeBudget)
  const pct = $derived(Math.min(100, (elapsedMs / 1000 / ex.timeBudget) * 100))
  const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`

  const hasAnswer = $derived(ex.type === 'choice' ? choice !== undefined : line !== undefined)

  async function check() {
    if (!hasAnswer || done) return
    correct =
      ex.type === 'choice' ? !!ex.options.find((o) => o.id === choice)?.correct : ex.correctLines.includes(line!)
    done = true
    await recordAttempt({
      type: 'attempt',
      sessionId,
      packId: manifest.id,
      packVersion: manifest.version,
      exerciseId: ex.id,
      answer: ex.type === 'choice' ? { optionId: choice! } : { line: line! },
      correct,
      elapsedMs: Math.round(elapsedMs),
      timeBudget: ex.timeBudget,
    })
  }

  const marks = $derived.by(() => {
    const m: Record<number, 'ok' | 'no'> = {}
    if (done && ex.type === 'line-select') {
      for (const l of ex.correctLines) m[l] = 'ok'
      if (!correct && line) m[line] = 'no'
    }
    return m
  })

  function mark(optionId: string, isCorrect: boolean | undefined) {
    if (done) return isCorrect ? 'ok' : optionId === choice ? 'no' : ''
    return optionId === choice ? 'sel' : ''
  }

  async function explain() {
    const prompt = `Explain this ${manifest.language.name} exercise (${item.topic.title}): ${ex.prompt}\n\n${ex.code.join('\n')}`
    try {
      await navigator.clipboard.writeText(prompt)
      toast = 'Prompt copied — paste it if the chat opens empty.'
    } catch {
      toast = ''
    }
    window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt.slice(0, 6000))}`, '_blank', 'noopener')
    setTimeout(() => (toast = ''), 3500)
  }

  const letter = (i: number) => 'ABCDEFGH'[i]
</script>

<div class="screen">
  <Code
    lines={ex.code}
    {lang}
    focus={ex.focus}
    pickable={ex.type === 'line-select' && !done}
    selected={done ? undefined : line}
    {marks}
    onpick={(n) => (line = n)}
  />

  {#if ex.type === 'choice'}
    <div class="keys">
      {#each options as o, i (o.id)}
        <button class="kbtn {mark(o.id, o.correct)}" disabled={done} onclick={() => (choice = o.id)}>{letter(i)}</button
        >
      {/each}
      {#if !done}<button class="btn" disabled={!hasAnswer} onclick={check}>Check</button>{/if}
    </div>
  {:else if !done}
    <div class="keys">
      <span class="time pick">{line ? `Line ${line} selected` : 'Tap a line number in the gutter'}</span>
      <button class="btn" disabled={!line} onclick={check}>Check</button>
    </div>
  {/if}

  <div class="sheet" class:shut={!open}>
    <div class="griprow">
      <button class="grip" onclick={() => (sheet = !sheet)} aria-expanded={open}>
        <span class="ring" class:over={overS > 0} style="--p:{pct}"></span>
        <span class="prompt">{ex.prompt}</span>
        <span class="chev">{open ? '▼' : '▲ answers'}</span>
      </button>
      <button
        class="leave"
        aria-label="Leave Session"
        title="Leave Session — your answers are kept"
        onclick={leaveSession}>✕</button
      >
    </div>
    <div class="sheet-body">
      <div class="meta">
        <b>{item.topic.title}</b>
        <span class="tag">{manifest.flavors[ex.flavor]?.label ?? ex.flavor}</span>
        <span>{index + 1} / {total}</span>
        {#if item.kind === 'review'}<span>review</span>{/if}
      </div>

      {#if ex.type === 'choice'}
        <div class="opts">
          {#each options as o, i (o.id)}
            <button class="opt {mark(o.id, o.correct)}" disabled={done} onclick={() => (choice = o.id)}>
              <span class="key">{letter(i)}</span>
              <span class="body">
                {#if o.code}<Code lines={o.code} {lang} gutter={false} />{:else if o.text}<span class="txt"
                    ><Prose source={o.text} /></span
                  >{/if}
                {#if done}<span class="why"><Prose source={o.rationale} /></span>{/if}
              </span>
            </button>
          {/each}
        </div>
      {:else if done}
        {#if !correct && line}
          <div class="note no">
            <b>Line {line}.</b>
            <Prose source={ex.lineRationales?.[line] ?? ex.fallbackRationale} />
          </div>
        {/if}
        <div class="note ok"><b>Line {ex.correctLines.join(', ')}.</b> <Prose source={ex.rationale} /></div>
      {/if}

      {#if done && ex.explanation}<div class="note"><Prose source={ex.explanation} /></div>{/if}

      {#if done}
        <div class="after">
          <span class="verdict" class:ok={correct} class:no={!correct}>{correct ? 'Correct' : 'Not quite'}</span>
          <span class="time" class:over={overS > 0}
            >{mmss(elapsedMs)}{overS > 0 ? ` · ${Math.round(overS)}s over budget` : ' · within budget'}</span
          >
          <button class="link" onclick={explain}>Explain more in Claude ↗</button>
          <button class="btn" onclick={nextExercise}>{last ? 'Finish' : 'Next'}</button>
        </div>
      {/if}

      {#if item.topic.primer}
        <button class="link" onclick={() => (primerOpen = true)}>Primer: {item.topic.primer.title}</button>
      {/if}
    </div>
  </div>

  {#if primerOpen && item.topic.primer}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="scrim" onclick={(e) => e.target === e.currentTarget && (primerOpen = false)}>
      <div class="primer">
        <div class="meta"><b>Primer</b><span>{item.topic.title}</span></div>
        <h2>{item.topic.primer.title}</h2>
        <Prose source={item.topic.primer.body} />
        <button class="btn ghost" onclick={() => (primerOpen = false)}>Back to the Exercise</button>
      </div>
    </div>
  {/if}
  {#if toast}<div class="toast">{toast}</div>{/if}
</div>

<style>
  .screen {
    flex: 1;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  .screen > :global(.code) {
    flex: 1;
    min-height: 0;
  }

  .keys {
    flex: none;
    display: flex;
    gap: 6px;
    padding: 8px 16px;
    border-top: 1px solid var(--rule);
    align-items: center;
    background: var(--ground);
  }
  .kbtn {
    flex: 1;
    min-height: 44px;
    border: 1px solid var(--rule);
    border-radius: 6px;
    text-align: center;
    font: 600 14px var(--mono);
    background: var(--surface);
  }
  .pick {
    flex: 1;
    font-size: 13px;
  }
  .kbtn:disabled {
    cursor: default;
  }
  .kbtn.sel {
    background: var(--accent);
    color: var(--surface);
    border-color: var(--accent);
  }
  .kbtn.ok {
    background: var(--good);
    color: var(--surface);
    border-color: var(--good);
  }
  .kbtn.no {
    background: var(--bad);
    color: var(--surface);
    border-color: var(--bad);
  }

  .sheet {
    flex: none;
    max-height: 62%;
    display: flex;
    flex-direction: column;
    background: var(--ground);
    border-top: 1px solid var(--rule);
    box-shadow: 0 -8px 24px rgba(10, 20, 40, 0.12);
  }
  .griprow {
    display: flex;
    align-items: center;
  }
  .leave {
    flex: none;
    width: 44px;
    height: 44px;
    margin-right: 6px;
    text-align: center;
    color: var(--muted);
  }
  .grip {
    flex: 1;
    min-width: 0;
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 16px;
    width: 100%;
    min-height: 48px;
  }
  .prompt {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
    text-wrap: balance;
  }
  .sheet.shut .prompt {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chev {
    color: var(--muted);
    font-size: 12px;
  }
  .ring {
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: conic-gradient(var(--accent) calc(var(--p, 0) * 1%), var(--sunk) 0);
  }
  .ring.over {
    background: var(--warn);
  }
  .sheet-body {
    overflow-y: auto;
    padding: 0 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .sheet.shut .sheet-body {
    display: none;
  }

  .opts {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .opt {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--rule);
    border-radius: 6px;
    padding: 10px 12px;
    min-height: 44px;
    transition: background-color 0.12s;
  }
  .opt:disabled {
    cursor: default;
  }
  .key {
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1.5px solid var(--muted);
    font: 600 11px/19px var(--mono);
    text-align: center;
    color: var(--muted);
  }
  .body {
    flex: 1;
    min-width: 0;
    display: block;
  }
  .txt {
    display: block;
    font: 13px/1.5 var(--mono);
  }
  .opt.sel {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .opt.sel .key {
    border-color: var(--accent);
    color: var(--accent);
  }
  .opt.ok {
    border-color: var(--good);
    background: var(--good-soft);
  }
  .opt.ok .key {
    background: var(--good);
    border-color: var(--good);
    color: var(--surface);
  }
  .opt.no {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
  .opt.no .key {
    background: var(--bad);
    border-color: var(--bad);
    color: var(--surface);
  }
  .why {
    display: block;
    font: 14px/1.5 var(--ui);
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed var(--rule);
  }

  .verdict {
    font-weight: 600;
  }
  .verdict.ok {
    color: var(--good);
  }
  .verdict.no {
    color: var(--bad);
  }
  .after {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: center;
  }
  .after .btn {
    margin-left: auto;
  }
  .note {
    font-size: 14px;
    line-height: 1.5;
    background: var(--surface);
    border-left: 3px solid var(--rule);
    padding: 8px 12px;
  }
  .note.ok {
    border-color: var(--good);
  }
  .note.no {
    border-color: var(--bad);
  }
  .note :global(p) {
    display: inline;
  }

  .scrim {
    position: absolute;
    inset: 0;
    background: rgba(10, 16, 24, 0.5);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 5;
  }
  .primer {
    background: var(--surface);
    max-width: 640px;
    width: 100%;
    max-height: 80%;
    overflow-y: auto;
    padding: 18px 16px 22px;
    border-radius: 12px 12px 0 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .primer h2 {
    margin: 0;
    font-size: 18px;
  }
  .toast {
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 12px;
    margin: auto;
    max-width: 420px;
    background: var(--ink);
    color: var(--ground);
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 13px;
    z-index: 6;
  }

  @media (min-width: 900px) {
    .opts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }
    .sheet {
      max-height: 50%;
    }
  }
</style>
