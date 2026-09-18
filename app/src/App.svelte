<script lang="ts">
  import { schedule } from './core/schedule'
  import { composeSession, mastery, streak } from './core/session'
  import type { LogEvent } from './core/types'
  import { app, boot, importEvents, record, startSession } from './state.svelte'
  import ExerciseScreen from './ui/ExerciseScreen.svelte'

  boot()

  const events = $derived($state.snapshot(app.events) as LogEvent[])
  const states = $derived(app.pack ? schedule(events, app.pack.manifest.id) : new Map())
  const upcoming = $derived(app.pack ? composeSession(app.pack, events, Date.now()) : [])
  const days = $derived(streak(events, Date.now(), new Date().getTimezoneOffset()))
  let notice = $state('')

  function exportLog() {
    const blob = new Blob([JSON.stringify({ format: 'bite-trainer-progress', formatVersion: 1, exportedAt: Date.now(), events }, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importLog(ev: Event) {
    const file = (ev.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (data.format !== 'bite-trainer-progress' || data.formatVersion !== 1 || !Array.isArray(data.events)) throw new Error('not a progress file')
      const added = await importEvents(data.events)
      notice = `Imported: ${added} new, ${data.events.length - added} already present.`
    } catch (e) {
      notice = `Import failed: ${e instanceof Error ? e.message : e}`
    }
  }
</script>

{#if app.error}
  <main><p class="err">{app.error}</p></main>
{:else if !app.pack}
  <main><p>Loading…</p></main>
{:else if app.session}
  {@const s = app.session}
  {#key s.index}
    <ExerciseScreen item={s.items[s.index]} manifest={app.pack.manifest} sessionId={s.id} index={s.index} total={s.items.length} />
  {/key}
{:else}
  <main>
    <h1>{app.pack.manifest.title}</h1>
    <p class="muted">{app.pack.manifest.description}</p>
    <p class="streak">Streak: <b>{days}</b> day{days === 1 ? '' : 's'}</p>

    {#if upcoming.length}
      <button class="btn start" onclick={startSession}>
        Start Session · {upcoming.length} Exercise{upcoming.length === 1 ? '' : 's'}
        ({upcoming.filter((i) => i.kind === 'review').length} review)
      </button>
    {:else}
      <p class="done">Nothing due today. Come back tomorrow.</p>
    {/if}

    <h2>Topics</h2>
    <ul>
      {#each app.pack.topics as t}
        {@const m = mastery(t, states)}
        <li>
          <span>{t.title}</span>
          <span class="bar"><span style="width:{m * 100}%"></span></span>
          <span class="muted">{t.exercises.filter((e) => states.has(e.id)).length}/{t.exercises.length}</span>
        </li>
      {/each}
    </ul>

    <h2>Progress</h2>
    <div class="row">
      <button onclick={exportLog}>Export</button>
      <label class="btn-file">Import<input type="file" accept="application/json,.json" onchange={importLog} hidden /></label>
      <button onclick={() => record({ type: 'reset', packId: app.pack!.manifest.id })}>Erase progress for this Pack</button>
    </div>
    {#if notice}<p class="muted">{notice}</p>{/if}
    <p class="muted small">
      {events.length} events · Pack {app.pack.manifest.id} v{app.pack.manifest.version}
      {#if app.packUpdate === 'updated'} · update ready, applies on next launch{:else if app.packUpdate === 'offline'} · offline{:else if app.packUpdate === 'invalid'} · update refused: Pack has problems{/if}
      {#if app.persisted === false} · storage not protected — export regularly{/if}
    </p>
  </main>
{/if}

<style>
  main { width: 100%; max-width: 560px; margin: 0 auto; padding: 24px 16px; overflow-y: auto; }
  h1 { margin: 0; font-size: 26px; }
  h2 { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); margin: 28px 0 8px; }
  .muted { color: var(--muted); }
  .small { font: 12px var(--mono); }
  .err { color: var(--bad); }
  .start { width: 100%; min-height: 52px; }
  .done { padding: 12px; border-left: 3px solid var(--good); background: var(--surface); }
  ul { list-style: none; padding: 0; margin: 0; }
  li { display: grid; grid-template-columns: 1fr 90px 36px; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--rule); }
  li .muted { font: 12px var(--mono); text-align: right; }
  .bar { height: 6px; border-radius: 3px; background: var(--sunk); overflow: hidden; }
  .bar span { display: block; height: 100%; background: var(--good); }
  .row { display: flex; flex-wrap: wrap; gap: 8px; }
  .row button, .btn-file { padding: 8px 14px; border: 1px solid var(--rule); border-radius: 6px; background: var(--surface); cursor: pointer; color: var(--accent); font-weight: 500; font-size: 13px; }
</style>
