<script lang="ts">
  import type { SessionSummary } from '../core/session'

  let { summary, streak, ondone }: { summary: SessionSummary; streak: number; ondone: () => void } = $props()

  const minutes = $derived(Math.max(1, Math.round(summary.elapsedMs / 60_000)))
</script>

<main>
  <div class="meta"><b>Today</b><span>Streak: {streak} day{streak === 1 ? '' : 's'}</span></div>
  <h1>Session complete</h1>

  <dl>
    <div>
      <dt>{summary.answered} answered</dt>
      <dd>in about {minutes} min of reading</dd>
    </div>
    <div class="ok">
      <dt>{summary.correct} correct</dt>
      <dd>these move up and come back later</dd>
    </div>
    {#if summary.overtime}
      <div class="warn">
        <dt>{summary.overtime} over budget</dt>
        <dd>correct, but slow — they stay where they are</dd>
      </div>
    {/if}
    {#if summary.missed.length}
      <div class="no">
        <dt>{summary.missed.length} missed</dt>
        <dd>back in tomorrow's Review Queue</dd>
      </div>
    {/if}
  </dl>

  {#if summary.missed.length}
    <h2>Missed</h2>
    <ul>
      {#each summary.missed as m (m.exerciseId)}
        <li><b>{m.topic}</b> <span class="tag">{m.exerciseId}</span></li>
      {/each}
    </ul>
  {/if}

  <button class="btn" onclick={ondone}>Done</button>
</main>

<style>
  main {
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
    padding: 24px 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  h1 {
    margin: 0;
    font-size: 26px;
  }
  h2 {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    margin: 8px 0 0;
  }
  dl {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  dl div {
    background: var(--surface);
    border-left: 3px solid var(--rule);
    padding: 8px 12px;
  }
  dl .ok {
    border-color: var(--good);
  }
  dl .warn {
    border-color: var(--warn);
  }
  dl .no {
    border-color: var(--bad);
  }
  dt {
    font-weight: 600;
  }
  dd {
    margin: 0;
    font-size: 14px;
    color: var(--muted);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 14px;
  }
  .btn {
    margin-top: 8px;
  }
</style>
