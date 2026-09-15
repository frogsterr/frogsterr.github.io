(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const themeButton = $('.theme-toggle');
  const introduction = $('#introduction');
  let splashTimer = 0, cueTimer = 0, introShown = false;
  function cancelStoryTransition() { clearTimeout(splashTimer); splashTimer = 0; }
  function revealIntroduction() {
    if (introShown) return;
    introShown = true;
    introduction.classList.add('is-introduced');
    cueTimer = setTimeout(() => introduction.classList.add('show-scroll'), reduced.matches ? 0 : 1800);
  }
  document.body.classList.add('story-ready');
  new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) revealIntroduction();
  }, { threshold: .55 }).observe(introduction);
  function setTheme(pond) {
    document.body.dataset.theme = pond ? 'pond' : 'paper';
    themeButton.setAttribute('aria-pressed', String(pond));
    themeButton.setAttribute('aria-label', pond ? 'Switch to ivory theme' : 'Switch to blue pond theme');
    $('.theme-label').textContent = pond ? 'Back to the surface?' : 'A little color?';
    $('meta[name="theme-color"]').content = pond ? '#263fcd' : '#f7f7f0';
  }
  themeButton.addEventListener('click', () => setTheme(document.body.dataset.theme !== 'pond'));

  // A small, keyboard- and touch-operable playground. Progress is session-only.
  const game = $('.playground'), frogPosition = $('.frog-position'), frog = $('.frog');
  const pond = $('.pond'), message = $('.game-message'), resetButton = $('.game-reset');
  let x = 0.16, facing = 1, jumpStart = null, jumping = false, completed = false;
  let lastTime = 0, raf = 0, width = 1, frogWidth = 130, movingUntil = 0;
  const held = new Set();
  const baseMessage = '';
  function setMessage(text) { if (message.textContent !== text) message.textContent = text; }
  function sceneActive() {
    const bounds = game.getBoundingClientRect();
    return (bounds.bottom > Math.min(160, bounds.height * .35) && bounds.top < innerHeight) || window.scrollY < 24;
  }
  function measure() { width = game.clientWidth; frogWidth = frogPosition.offsetWidth; frogPosition.style.top = ($('.ground').offsetTop - frogWidth * .85) + 'px'; position(); }
  function position(height = 0) {
    frogPosition.style.transform = `translate3d(${x * (width - frogWidth)}px,${-height}px,0)`;
    frog.style.transform = `scaleX(${facing}) rotate(${jumping ? -facing * 7 : 0}deg)`;
    frogPosition.dataset.facing = facing === 1 ? 'right' : 'left';
  }
  function inPool() {
    const center = x * (width - frogWidth) + frogWidth / 2;
    return center >= pond.offsetLeft + 3 && center <= pond.offsetLeft + pond.offsetWidth - 3;
  }
  function splash() {
    if (completed) return;
    completed = true;
    game.classList.add('completed');
    held.clear();
    setTheme(true);
    cancelStoryTransition();
    const splashScrollY = window.scrollY;
    // Allow the 850ms palette transition to finish, then hold for a full second.
    splashTimer = setTimeout(() => {
      splashTimer = 0;
      if (!completed || document.hidden || !sceneActive() || Math.abs(window.scrollY - splashScrollY) > 80) return;
      window.scrollTo({ top: layoutTop(introduction), behavior: reduced.matches ? 'instant' : 'smooth' });
    }, reduced.matches ? 1100 : 1950);
    setMessage('Splash! Meet Ben.');
    resetButton.hidden = false;
    if (!reduced.matches) {
      for (let i = 0; i < 13; i++) {
        const drop = document.createElement('i');
        drop.style.setProperty('--x', `${(i - 6) * 16}px`);
        drop.style.setProperty('--y', `${-25 - Math.sin((i + 1) / 14 * Math.PI) * 90}px`);
        $('.splash-particles').append(drop);
        drop.addEventListener('animationend', () => drop.remove(), { once: true });
      }
    }
  }
  function startLoop() { if (!raf) { lastTime = 0; raf = requestAnimationFrame(tick); } }
  function hop() {
    if (jumping || completed) return;
    jumping = true; jumpStart = null;
    if (inPool()) setMessage('One small hop…');
    startLoop();
  }
  function nudge(direction) {
    if (completed) return;
    facing = direction;
    x = Math.max(0, Math.min(1, x + direction * .045));
    movingUntil = performance.now() + 140;
    if (inPool() && !jumping) setMessage('You found it. Hop in!');
    else if (!jumping) setMessage(baseMessage);
    position(); startLoop();
  }
  function tick(time) {
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
    lastTime = time;
    let moving = false;
    if (!completed) {
      const direction = Number(held.has('right')) - Number(held.has('left'));
      if (direction) { facing = direction; x = Math.max(0, Math.min(1, x + direction * dt * .29)); moving = true; }
    }
    let height = 0;
    if (jumping) {
      if (jumpStart === null) jumpStart = time;
      const progress = Math.min(1, (time - jumpStart) / (reduced.matches ? 100 : 670));
      height = reduced.matches ? 0 : Math.sin(progress * Math.PI) * 88;
      if (progress >= 1) { jumping = false; jumpStart = null; if (inPool()) splash(); }
    } else if ((moving || time < movingUntil) && !reduced.matches) {
      height = Math.abs(Math.sin(time / 95)) * 6;
    }
    if (moving && !jumping && !completed) setMessage(inPool() ? 'You found it. Hop in!' : baseMessage);
    position(height);
    if (moving || jumping || time < movingUntil) raf = requestAnimationFrame(tick);
    else { raf = 0; lastTime = 0; }
  }
  // Page-level controls work immediately, without focusing a game container.
  // Once the scene is off screen, leave the browser's normal keys alone.
  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || completed || !sceneActive()) return;
    if (e.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="slider"], [role="spinbutton"], dialog, [role="dialog"]')) return;
    if (e.target.closest('button, a, summary, [role="button"]') && (e.code === 'Space' || e.code === 'Enter')) return;
    if (['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)) {
      e.preventDefault(); const direction = ['ArrowLeft','KeyA'].includes(e.code) ? 'left' : 'right';
      if (!held.has(direction)) nudge(direction === 'left' ? -1 : 1);
      held.add(direction); startLoop();
    } else if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); hop(); }
  });
  window.addEventListener('keyup', (e) => {
    if (['ArrowLeft','KeyA'].includes(e.code)) held.delete('left');
    if (['ArrowRight','KeyD'].includes(e.code)) held.delete('right');
  });
  function release() { held.clear(); }
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
  window.addEventListener('scroll', () => { if (!sceneActive()) release(); }, { passive: true });
  document.querySelectorAll('[data-move]').forEach(button => {
    button.addEventListener('pointerdown', e => { if (e.button !== 0) return; button.setPointerCapture(e.pointerId); held.add(button.dataset.move); startLoop(); });
    button.addEventListener('pointerup', () => held.delete(button.dataset.move));
    button.addEventListener('pointercancel', () => held.delete(button.dataset.move));
    button.addEventListener('lostpointercapture', () => held.delete(button.dataset.move));
    button.addEventListener('click', () => nudge(button.dataset.move === 'left' ? -1 : 1));
  });
  $('#jump').addEventListener('click', hop);
  resetButton.addEventListener('click', () => {
    cancelStoryTransition(); clearTimeout(cueTimer); introShown = false; introduction.classList.remove('is-introduced', 'show-scroll');
    release(); completed = false; game.classList.remove('completed'); jumping = false; x = .16; facing = 1; setMessage(baseMessage);
    resetButton.hidden = true; setTheme(false); position();
    const focusTarget = $('#jump').offsetParent ? $('#jump') : $('.wordmark');
    focusTarget.focus({ preventScroll: true });
  });
  new ResizeObserver(measure).observe(game);

  // The walk uses normal page scrolling. Arrow keys and stop buttons move to a readable pause.
  const walk = $('#walk'), stage = $('.walk-stage'), track = $('.walk-track');
  const stops = [...document.querySelectorAll('.walk-stop')];
  const stopLinks = [...document.querySelectorAll('.walk-stop-link')];
  const walker = $('.walk-frog'), walkerImage = $('.walk-frog .frog');
  const compact = matchMedia('(max-height: 700px)');
  let enhanced = false, walkStart = 0, stepHeight = 1, currentStop = -1;
  let walkFrame = 0, motionTimer = 0, senseTimer = 0, previousY = window.scrollY, announcedStop = -1;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function layoutTop(element) {
    let top = 0;
    for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
    return top;
  }
  function walkActive() {
    const bounds = walk.getBoundingClientRect();
    return enhanced && bounds.top <= 5 && bounds.bottom >= stage.clientHeight - 5;
  }
  function sense() {
    clearTimeout(senseTimer);
    walker.classList.add('is-sensing');
    senseTimer = setTimeout(() => walker.classList.remove('is-sensing'), 1300);
  }
  function updateWalk() {
    walkFrame = 0;
    if (!enhanced) return;
    const progress = clamp((window.scrollY - walkStart) / stepHeight, 0, stops.length);
    const segment = Math.floor(progress);
    const fraction = clamp((progress - segment - .3) / .7, 0, 1);
    const eased = fraction * fraction * (3 - 2 * fraction);
    const camera = Math.min(segment + eased, stops.length - 1);
    const nextStop = Math.round(camera);
    track.style.transform = `translate3d(${-camera * stage.clientWidth}px,0,0)`;
    if (nextStop !== currentStop) {
      currentStop = nextStop;
      stops.forEach((stop, index) => {
        const active = index === currentStop;
        stop.inert = !active;
        stop.setAttribute('aria-hidden', String(!active));
        if (active) stopLinks[index].setAttribute('aria-current', 'step');
        else stopLinks[index].removeAttribute('aria-current');
      });
      $('.walk-count').innerHTML = `${String(currentStop + 1).padStart(2, '0')} <span>/ ${String(stops.length).padStart(2, '0')}</span>`;
      $('.walk-prev').disabled = currentStop === 0;
      $('.walk-next').setAttribute('aria-label', currentStop === stops.length - 1 ? 'Continue to say hello' : 'Next stop');
      if (walkActive()) sense();
    }
    if (walkActive() && announcedStop !== currentStop) {
      announcedStop = currentStop;
      $('.walk-status').textContent = `Stop ${currentStop + 1} of ${stops.length}: ${stops[currentStop].dataset.stop}.`;
    }
    const delta = window.scrollY - previousY;
    if (walkActive() && Math.abs(delta) > .5 && progress < stops.length - .5) {
      walker.dataset.facing = delta > 0 ? 'right' : 'left';
      walkerImage.style.transform = `scaleX(${delta > 0 ? 1 : -1})`;
      walker.classList.add('is-walking');
      clearTimeout(motionTimer);
      motionTimer = setTimeout(() => walker.classList.remove('is-walking'), 140);
    }
    previousY = window.scrollY;
  }
  function scheduleWalk() { if (!walkFrame) walkFrame = requestAnimationFrame(updateWalk); }
  function configureWalk() {
    // Short screens and reduced-motion readers get all of the same stops in a normal vertical flow.
    enhanced = !compact.matches && !reduced.matches;
    walk.classList.toggle('walk-enhanced', enhanced);
    const sceneHeight = enhanced ? stage.clientHeight : innerHeight;
    walk.style.height = enhanced ? `${sceneHeight * (1 + (stops.length - 1) * .92)}px` : '';
    stepHeight = sceneHeight * .92;
    walkStart = layoutTop(walk);
    currentStop = -1;
    if (!enhanced) {
      track.style.transform = '';
      stops.forEach(stop => { stop.inert = false; stop.removeAttribute('aria-hidden'); });
    }
    scheduleWalk();
  }
  function goTo(element) {
    window.scrollTo({ top: layoutTop(element), behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  function goToStop(index) {
    cancelStoryTransition();
    if (index >= stops.length) { goTo($('#contact')); return; }
    if (index < 0) return;
    if (enhanced) window.scrollTo({ top: walkStart + index * stepHeight, behavior: 'smooth' });
    else goTo(stops[index]);
  }
  stopLinks.forEach((link, index) => link.addEventListener('click', () => goToStop(index)));
  $('.walk-prev').addEventListener('click', () => goToStop(currentStop - 1));
  $('.walk-next').addEventListener('click', () => goToStop(currentStop + 1));
  window.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !walkActive()) return;
    if (e.target.closest('input,textarea,select,[contenteditable],summary,[role="slider"],dialog')) return;
    if (['ArrowRight','KeyD','ArrowLeft','KeyA'].includes(e.code)) {
      e.preventDefault();
      if (!e.repeat) goToStop(currentStop + (['ArrowRight','KeyD'].includes(e.code) ? 1 : -1));
    }
  });
  window.addEventListener('scroll', scheduleWalk, { passive: true });
  window.addEventListener('resize', configureWalk);
  reduced.addEventListener('change', configureWalk);
  configureWalk();
  document.fonts.ready.then(configureWalk);
  document.querySelectorAll('.hobby').forEach(word => {
    word.addEventListener('pointerenter', sense);
    word.addEventListener('focus', sense);
    word.addEventListener('pointerdown', sense);
  });

  window.addEventListener('wheel', cancelStoryTransition, { passive: true });
  window.addEventListener('touchstart', cancelStoryTransition, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelStoryTransition(); });
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = $(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      cancelStoryTransition();
      if (location.hash !== link.hash) history.pushState(null, '', link.hash);
      goTo(target);
    });
  });
  if (!reduced.matches) {
    document.body.classList.add('js-motion');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .07 });
    $('.contact-heading').classList.add('reveal');
    observer.observe($('.contact-heading'));
  }
  if (matchMedia('(pointer: fine)').matches && !reduced.matches) {
    const halo = $('.cursor-halo');
    document.addEventListener('pointermove', e => {
      halo.style.left = e.clientX + 'px'; halo.style.top = e.clientY + 'px'; halo.style.opacity = '0.7';
      halo.classList.toggle('over-link', !!e.target.closest('a,button,.word-play,.hobby'));
    });
    document.addEventListener('pointerleave', () => { halo.style.opacity = '0'; });
  }
})();
