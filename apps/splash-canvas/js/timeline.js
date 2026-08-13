export function createTimeline(duration = 16) {
  return {
    cues: [],
    t: 0,
    duration,
    playing: false,
    looping: true,
    lastIndex: -1,
  };
}

export function sortCues(cues) {
  return [...cues].sort((a, b) => a.at - b.at || String(a.fn).localeCompare(String(b.fn)));
}

export function addCue(timeline, cue) {
  const next = {
    id: cue.id || `cue-${timeline.cues.length}-${Math.round((cue.at || 0) * 1000)}`,
    at: Number(cue.at) || 0,
    fn: String(cue.fn || ""),
    args: cue.args || {},
  };
  timeline.cues = sortCues([...timeline.cues, next]);
  if (next.at > timeline.duration) timeline.duration = next.at + 1;
  return next;
}

export function playTimeline(timeline) {
  timeline.playing = true;
  if (timeline.t >= timeline.duration) timeline.t = 0;
}

export function pauseTimeline(timeline) {
  timeline.playing = false;
}

export function stopTimeline(timeline) {
  timeline.playing = false;
  timeline.t = 0;
  timeline.lastIndex = -1;
}

export function seekTimeline(timeline, t) {
  timeline.t = Math.max(0, t);
  timeline.lastIndex = -1;
}

/**
 * Advance the clock. Returns cues that should fire this slice
 * (those with at in (prev, t] , wrapping when looping).
 */
export function stepTimeline(timeline, dt) {
  if (!timeline.playing) return [];
  const prev = timeline.t;
  let t = prev + Math.max(0, dt);
  const fired = [];
  const cues = timeline.cues || [];
  const duration = Math.max(0.001, timeline.duration || 1);

  const collect = (from, to) => {
    for (const cue of cues) {
      if (cue.at > from && cue.at <= to) fired.push(cue);
    }
  };

  if (t <= duration) {
    collect(prev, t);
    timeline.t = t;
    return fired;
  }

  collect(prev, duration);
  if (!timeline.looping) {
    timeline.t = duration;
    timeline.playing = false;
    return fired;
  }
  t %= duration;
  collect(-1e-9, t);
  timeline.t = t;
  return fired;
}
