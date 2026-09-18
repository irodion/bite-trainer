<script lang="ts">
  import { parseBlock, type Inline } from '../core/markdown'

  let { source }: { source: string | string[] } = $props()
  const blocks = $derived((Array.isArray(source) ? source : [source]).map(parseBlock))
</script>

{#snippet inline(nodes: Inline[])}
  {#each nodes as n, i (i)}
    {#if n.t === 'text'}{n.v}{:else if n.t === 'code'}<code>{n.v}</code>{:else if n.t === 'strong'}<strong
        >{@render inline(n.c)}</strong
      >{:else}<em>{@render inline(n.c)}</em>{/if}
  {/each}
{/snippet}

{#each blocks as b, i (i)}
  {#if b.t === 'pre'}<pre>{b.lines.join('\n')}</pre>{:else}<p>{@render inline(b.c)}</p>{/if}
{/each}

<style>
  p {
    margin: 0 0 0.6em;
  }
  p:last-child {
    margin-bottom: 0;
  }
  code,
  pre {
    font-family: var(--mono);
    font-size: 0.85em;
  }
  code {
    background: var(--line);
    padding: 0.05em 0.3em;
    border-radius: 4px;
  }
  pre {
    overflow-x: auto;
    padding: 0.6em;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 6px;
    margin: 0 0 0.6em;
  }
</style>
