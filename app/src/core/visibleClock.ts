/**
 * A running page ticks every 500 ms. A gap between two observations longer than this means the page was not
 * running — frozen in the background, the device asleep, the debugger paused — whatever the browser reported.
 */
export const MAX_OBSERVED_GAP_MS = 2000

/**
 * Counts the time a Learner could actually see an Exercise. It only adds time it has *watched* pass: the span
 * between two observations (a tick, a visibility change, a read) counts if the page was visible throughout and
 * the span is short enough to have been continuous. Time is injected, so this is pure and testable.
 */
export class VisibleClock {
  private total = 0
  private last: number
  private visible: boolean

  constructor(now: number, visible: boolean) {
    this.last = now
    this.visible = visible
  }

  /** Called regularly while the Exercise is open. Keeps the observations close together. */
  tick(now: number) {
    this.total += this.watched(now)
    this.last = now
  }

  hide(now: number) {
    this.tick(now)
    this.visible = false
  }

  show(now: number) {
    if (this.visible) return
    this.visible = true
    this.last = now
  }

  /** Visible milliseconds so far, exact to `now`. Does not change the clock. */
  read(now: number): number {
    return this.total + this.watched(now)
  }

  private watched(now: number): number {
    const gap = now - this.last
    return this.visible && gap > 0 && gap <= MAX_OBSERVED_GAP_MS ? gap : 0
  }
}
