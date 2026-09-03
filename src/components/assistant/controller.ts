import { resultPage, randomPost, type AssistantPost } from './search';
import { isRoomTap, type TapStart } from '../room/gesture';

/** Independent of Three/WebGL: the assistant still works beside the fallback. */
export function mountAssistant(root: HTMLElement) {
  const get = <T extends HTMLElement>(selector: string) =>
    root.querySelector<T>(selector)!;
  const toggle = get<HTMLButtonElement>('[data-coal-toggle]');
  const art = get<HTMLElement>('[data-coal-static]');
  const position = get<HTMLElement>('[data-coal-position]');
  const panel = get<HTMLElement>('#coal-panel');
  const input = get<HTMLInputElement>('[data-coal-search]');
  const controls = get<HTMLElement>('[data-coal-controls]');
  const rest = get<HTMLButtonElement>('[data-coal-rest]');
  const note = get<HTMLElement>('[data-coal-note]');
  const results = get<HTMLOListElement>('[data-coal-results]');
  const status = get<HTMLElement>('[data-coal-status]');
  const heading = get<HTMLElement>('[data-coal-results-heading]');
  const more = get<HTMLButtonElement>('[data-coal-more]');
  const random = get<HTMLButtonElement>('[data-coal-random]');
  const roomRoot = root.closest<HTMLElement>('[data-room]')!;
  const stage = roomRoot.querySelector<HTMLElement>('[data-room-stage]')!;
  const posts = JSON.parse(
    get<HTMLScriptElement>('[data-coal-index]').textContent || '[]',
  ) as AssistantPost[];
  const events = new AbortController();
  const { signal } = events;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set<Animation>();
  let open = false,
    expanded = false,
    composing = false,
    sleeping = root.dataset.sleeping === 'true';
  let visible = false,
    disposed = false,
    blinkTimer: ReturnType<typeof setTimeout> | undefined;
  let eyeFrame = 0;
  let resumedCleanup: (() => void) | undefined;
  let down: TapStart | null = null;
  let validPointerClick = false;
  const eyes = toggle.querySelector<SVGElement>('[data-coal-eyes]')!;
  const body = toggle.querySelector<SVGElement>('[data-coal-body]')!;
  const awake = () =>
    !disposed && !sleeping && !document.hidden && visible && !motion.matches;

  function animate(element: Element, frames: Keyframe[], duration: number) {
    if (!awake() || !element.animate) return;
    const animation = element.animate(frames, { duration, easing: 'ease-out' });
    animations.add(animation);
    animation.finished
      .then(() => animations.delete(animation))
      .catch(() => animations.delete(animation));
  }
  function stopMotion() {
    clearTimeout(blinkTimer);
    blinkTimer = undefined;
    cancelAnimationFrame(eyeFrame);
    eyeFrame = 0;
    animations.forEach((animation) => animation.cancel());
    animations.clear();
    toggle.style.removeProperty('--coal-eye-x');
    toggle.style.removeProperty('--coal-eye-y');
  }
  function scheduleBlink() {
    if (!awake()) return;
    blinkTimer = setTimeout(
      () => {
        blinkTimer = undefined;
        animate(
          eyes,
          [
            { transform: 'scaleY(1)' },
            { transform: 'scaleY(.12)', offset: 0.5 },
            { transform: 'scaleY(1)' },
          ],
          190,
        );
        scheduleBlink();
      },
      5200 + Math.random() * 2800,
    );
  }
  function syncMotion() {
    stopMotion();
    root.dataset.motion = motion.matches
      ? 'reduced'
      : awake()
        ? 'awake'
        : 'paused';
    scheduleBlink();
  }
  function renderResults() {
    const query = input.value;
    const page = resultPage(posts, query, expanded);
    heading.textContent =
      query.trim() && !page.empty ? '找到的笔记' : '最近的笔记';
    status.textContent = page.empty
      ? '没找到，换个关键词试试。也可以看看下面几篇。'
      : !posts.length
        ? '还没有笔记，过阵子再来看看。'
        : query.trim()
          ? `找到 ${page.total} 篇，显示 ${page.visible.length} 篇`
          : '先看看最近写的这几篇';
    results.replaceChildren();
    for (const post of page.visible) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = post.href;
      const meta = document.createElement('small');
      meta.textContent = `${post.category} · ${new Date(post.publishedAt).toLocaleDateString('zh-CN')}`;
      const title = document.createElement('strong');
      title.textContent = post.title;
      const description = document.createElement('p');
      description.textContent = post.description;
      link.append(meta, title, description);
      li.append(link);
      results.append(li);
    }
    more.hidden = !page.more;
    more.textContent = `显示全部 ${page.total} 篇结果`;
  }
  function setOpen(next: boolean, restoreFocus = true) {
    open = next && !sleeping;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      renderResults();
      input.focus({ preventScroll: true });
      panel.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    } else if (restoreFocus && !sleeping) toggle.focus();
  }
  function syncSleep() {
    root.dataset.sleeping = String(sleeping);
    position.hidden = sleeping;
    rest.textContent = sleeping ? '叫醒小煤球' : '让它休息';
    note.textContent = sleeping ? '小煤球休息中' : '房间里的小帮手';
    syncMotion();
  }
  toggle.addEventListener(
    'pointerdown',
    (event) => {
      validPointerClick = false;
      if (!event.isPrimary || event.button !== 0) {
        down = null;
        return;
      }
      down = {
        id: 'coal',
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        scrollY: scrollY,
        time: performance.now(),
        moved: false,
      };
    },
    { signal, passive: true },
  );
  toggle.addEventListener(
    'pointermove',
    (event) => {
      if (
        down &&
        Math.hypot(event.clientX - down.x, event.clientY - down.y) > 9
      )
        down.moved = true;
    },
    { signal, passive: true },
  );
  toggle.addEventListener(
    'pointerup',
    (event) => {
      validPointerClick = isRoomTap(down, {
        id: 'coal',
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        scrollY: scrollY,
        time: performance.now(),
      });
      down = null;
    },
    { signal },
  );
  const cancelTap = () => {
    down = null;
    validPointerClick = false;
  };
  toggle.addEventListener('pointercancel', cancelTap, { signal });
  toggle.addEventListener(
    'pointerleave',
    () => {
      if (down) down.moved = true;
    },
    { signal },
  );
  window.addEventListener(
    'scroll',
    () => {
      if (down) down.moved = true;
    },
    { signal, passive: true },
  );
  toggle.addEventListener(
    'click',
    (event) => {
      if (event.detail !== 0 && !validPointerClick) {
        event.preventDefault();
        return;
      }
      validPointerClick = false;
      animate(
        body,
        [
          { transform: 'translateY(0) scale(1)' },
          { transform: 'translateY(-7px) scale(.96,1.04)', offset: 0.4 },
          { transform: 'translateY(0) scale(1)' },
        ],
        260,
      );
      setOpen(!open);
    },
    { signal },
  );
  get('[data-coal-close]').addEventListener('click', () => setOpen(false), {
    signal,
  });
  root.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && !event.isComposing && open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    },
    { signal },
  );
  input.addEventListener(
    'compositionstart',
    () => {
      composing = true;
    },
    { signal },
  );
  input.addEventListener(
    'compositionend',
    () => {
      composing = false;
      expanded = false;
      renderResults();
    },
    { signal },
  );
  input.addEventListener(
    'input',
    () => {
      if (!composing) {
        expanded = false;
        renderResults();
      }
    },
    { signal },
  );
  more.addEventListener(
    'click',
    () => {
      expanded = true;
      renderResults();
      results.querySelectorAll<HTMLAnchorElement>('a')[6]?.focus();
    },
    { signal },
  );
  random.disabled = posts.length === 0;
  random.addEventListener(
    'click',
    () => {
      const post = randomPost(posts);
      if (post) location.assign(post.href);
    },
    { signal },
  );
  rest.addEventListener(
    'click',
    () => {
      sleeping = !sleeping;
      setOpen(false, false);
      syncSleep();
      if (!sleeping) toggle.focus();
    },
    { signal },
  );
  stage.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse' || !awake() || eyeFrame) return;
      const rect = toggle.getBoundingClientRect();
      const dx = event.clientX - rect.left - rect.width / 2,
        dy = event.clientY - rect.top - rect.height / 2;
      const nearby = Math.hypot(dx, dy) < 170;
      eyeFrame = requestAnimationFrame(() => {
        eyeFrame = 0;
        if (!awake()) return;
        toggle.style.setProperty(
          '--coal-eye-x',
          `${nearby ? Math.max(-2.5, Math.min(2.5, dx / 30)) : 0}px`,
        );
        toggle.style.setProperty(
          '--coal-eye-y',
          `${nearby ? Math.max(-2, Math.min(2, dy / 40)) : 0}px`,
        );
      });
    },
    { signal, passive: true },
  );
  // The mascot is a sibling of the canvas; listen at the room boundary as well.
  position.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'mouse' && awake()) {
        const rect = toggle.getBoundingClientRect();
        toggle.style.setProperty(
          '--coal-eye-x',
          `${(event.clientX - rect.left - rect.width / 2) / 15}px`,
        );
      }
    },
    { signal, passive: true },
  );
  stage.addEventListener(
    'pointerleave',
    () => {
      toggle.style.removeProperty('--coal-eye-x');
      toggle.style.removeProperty('--coal-eye-y');
    },
    { signal },
  );
  const intersection = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? false;
    syncMotion();
  });
  intersection.observe(position);
  motion.addEventListener('change', syncMotion, { signal });
  document.addEventListener(
    'visibilitychange',
    () => {
      cancelTap();
      syncMotion();
    },
    { signal },
  );
  function cleanup() {
    if (disposed) return;
    disposed = true;
    stopMotion();
    events.abort();
    intersection.disconnect();
    root.dataset.motion = 'paused';
  }
  window.addEventListener('pagehide', cleanup, { signal, once: true });
  const restore = (event: PageTransitionEvent) => {
    if (event.persisted && disposed && root.isConnected) {
      window.removeEventListener('pageshow', restore);
      resumedCleanup = mountAssistant(root);
    }
  };
  window.addEventListener('pageshow', restore);
  document.addEventListener(
    'astro:before-swap',
    () => {
      window.removeEventListener('pageshow', restore);
      cleanup();
    },
    { signal, once: true },
  );
  art.hidden = true;
  toggle.hidden = false;
  controls.hidden = false;
  setOpen(false, false);
  syncSleep();
  renderResults();
  root.dataset.ready = 'true';
  return () => {
    resumedCleanup?.();
    window.removeEventListener('pageshow', restore);
    cleanup();
  };
}
