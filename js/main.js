(() => {
  const D = window.VITRINE;
  if (!D) return;

  const doc = document.documentElement;
  const page = document.body.dataset.page;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const brandsOf = (key) => D.brands.filter((b) => b.page === key);
  const brandHref = (b) => `${D.pages[b.page].href}#${b.id}`;
  const vars = (b) => `--accent:${b.theme.accent};--deep:${b.theme.deep};--accent-ink:${b.theme.ink}`;
  const labelOf = (key, tag) => (D.pages[key].categories.find(([id]) => id === tag) || [tag, tag])[1];

  /* ---------- theme ---------- */

  const setTheme = (t) => {
    doc.dataset.theme = t;
    try {
      localStorage.setItem("vitrine-theme", t);
    } catch (e) {}
    $$("[data-theme-toggle]").forEach((b) => b.setAttribute("aria-pressed", String(t === "dark")));
  };
  setTheme(doc.dataset.theme === "dark" ? "dark" : "light");
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-theme-toggle]")) setTheme(doc.dataset.theme === "dark" ? "light" : "dark");
  });

  $$("[data-nav]").forEach((a) => {
    if (a.dataset.nav === page) a.setAttribute("aria-current", "page");
  });

  /* ---------- smooth scroll + scroll-driven effects ---------- */

  const header = $("[data-header]");
  const parallaxEls = $$("[data-parallax]");
  // data-drift: moves at its own speed relative to its parent's distance from the screen centre
  const driftEls = $$("[data-drift]");
  const onScroll = (y) => {
    if (header) header.classList.toggle("is-solid", y > 40);
    if (reduceMotion) return;
    parallaxEls.forEach((el) => {
      el.style.transform = `translate3d(0, ${(y * parseFloat(el.dataset.parallax)).toFixed(1)}px, 0)`;
    });
    driftEls.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      el.style.translate = `0 ${((r.top + r.height / 2 - innerHeight / 2) * -parseFloat(el.dataset.drift)).toFixed(1)}px`;
    });
  };

  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    const tick = (t) => {
      lenis.raf(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    lenis.on("scroll", ({ scroll }) => onScroll(scroll));
  } else {
    window.addEventListener("scroll", () => onScroll(window.scrollY), { passive: true });
  }
  onScroll(window.scrollY);

  const scrollToEl = (el) => {
    if (!el) return;
    const offset = -(header ? header.offsetHeight : 0) - 12;
    if (lenis) lenis.scrollTo(el, { offset });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: "smooth" });
  };

  const openDrawers = new Set();
  const lock = (name, on) => {
    on ? openDrawers.add(name) : openDrawers.delete(name);
    const locked = openDrawers.size > 0;
    doc.classList.toggle("is-locked", locked);
    if (lenis) locked ? lenis.stop() : lenis.start();
  };

  /* ---------- mega panels ---------- */

  $$("[data-mega]").forEach((el) => {
    const key = el.dataset.mega;
    const p = D.pages[key];
    el.innerHTML = `
      <div class="wrap mega-inner">
        <div>
          <p class="mega-h">Categories</p>
          <ul class="mega-list">
            <li><a href="${p.href}">All houses</a></li>
            ${p.categories.map(([id, label]) => `<li><a href="${p.href}?cat=${id}">${esc(label)}</a></li>`).join("")}
          </ul>
        </div>
        <div>
          <p class="mega-h">Houses</p>
          <ul class="mega-list mega-brands">
            ${brandsOf(key)
              .map((b) => `<li><a class="${b.theme.font}" style="${vars(b)}" href="${brandHref(b)}">${esc(b.name)}</a></li>`)
              .join("")}
          </ul>
        </div>
        <a class="mega-feature" href="${p.href}">
          <img src="${p.image}" alt="" loading="lazy" decoding="async">
          <span class="mega-caption"><span class="eyebrow">${esc(p.kicker)}</span><span class="mega-title">${esc(p.title)}</span></span>
        </a>
      </div>`;
  });

  /* ---------- menu drawer (drill-down, like the houses' own sites) ---------- */

  const menu = $("#menu");
  const menuScrim = $("[data-menu-scrim]");
  const menuBtn = $("[data-menu-open]");
  let lastFocus = null;

  if (menu) {
    const level = (key) => {
      const p = D.pages[key];
      return `
        <div class="menu-level" data-level="${key}">
          <button class="menu-back" type="button" data-back><span aria-hidden="true">&lsaquo;</span> ${esc(p.title)}</button>
          <ul class="menu-list">
            <li><a href="${p.href}">All houses</a></li>
            ${p.categories.map(([id, label]) => `<li><a href="${p.href}?cat=${id}">${esc(label)}</a></li>`).join("")}
          </ul>
          <p class="menu-h">Houses</p>
          <ul class="menu-list menu-list--brands">
            ${brandsOf(key)
              .map((b) => `<li><a class="${b.theme.font}" style="${vars(b)}" href="${brandHref(b)}">${esc(b.name)}</a></li>`)
              .join("")}
          </ul>
        </div>`;
    };
    menu.innerHTML = `
      <div class="menu-top">
        <a class="wordmark" href="about.html">Vitrine</a>
        <button class="icon-btn" type="button" data-menu-close aria-label="Close menu">&times;</button>
      </div>
      <div class="menu-levels">
        <div class="menu-level is-active" data-level="root">
          <ul class="menu-list">
            <li><a href="index.html">Home</a></li>
            <li><button type="button" data-go="jewelry">${esc(D.pages.jewelry.title)} <span class="chev" aria-hidden="true">&rsaquo;</span></button></li>
            <li><button type="button" data-go="beauty">${esc(D.pages.beauty.title)} <span class="chev" aria-hidden="true">&rsaquo;</span></button></li>
            <li><a href="index.html#signatures">Icons</a></li>
            <li><a href="about.html">About Vitrine</a></li>
            <li><a href="about.html#contact">Contact</a></li>
          </ul>
          <div class="menu-foot">
            <button class="btn btn-line" type="button" data-theme-toggle aria-pressed="false">Light / Dark <span aria-hidden="true">&#9680;</span></button>
          </div>
        </div>
        ${level("jewelry")}
        ${level("beauty")}
      </div>`;
    setTheme(doc.dataset.theme);

    const setLevel = (name) => {
      $$(".menu-level", menu).forEach((l) => {
        const active = l.dataset.level === name;
        l.classList.toggle("is-active", active);
        l.classList.toggle("is-behind", !active && l.dataset.level === "root" && name !== "root");
      });
      const first = $(`.menu-level[data-level="${name}"] a, .menu-level[data-level="${name}"] button`, menu);
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 80);
    };

    const openMenu = () => {
      lastFocus = document.activeElement;
      setLevel("root");
      menu.classList.add("is-open");
      menuScrim.classList.add("is-open");
      menuBtn.setAttribute("aria-expanded", "true");
      lock("menu", true);
    };
    window.vitrineCloseMenu = () => {
      if (!menu.classList.contains("is-open")) return;
      menu.classList.remove("is-open");
      menuScrim.classList.remove("is-open");
      menuBtn.setAttribute("aria-expanded", "false");
      lock("menu", false);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };

    menuBtn.addEventListener("click", openMenu);
    menuScrim.addEventListener("click", window.vitrineCloseMenu);
    menu.addEventListener("click", (e) => {
      if (e.target.closest("[data-menu-close]")) return window.vitrineCloseMenu();
      const go = e.target.closest("[data-go]");
      if (go) return setLevel(go.dataset.go);
      if (e.target.closest("[data-back]")) setLevel("root");
    });
  }

  /* ---------- brand grid, filters and the house panel ---------- */

  const grid = $("[data-grid]");
  const panel = $("[data-panel]");
  const panelScrim = $("[data-panel-scrim]");
  let current = null;

  const cardHTML = (b, i) => `
    <article class="brand-card tilt reveal" data-brand="${b.id}" data-tags="${b.tags.join(" ")}" style="${vars(b)};--d:${(i % 3) * 90}ms">
      <div class="tilt-inner" data-tilt>
        <div class="media"><img src="${b.image}" alt="${esc(b.imageAlt)}" style="object-position:${b.focus}" loading="lazy" decoding="async"></div>
        <div class="shade"></div>
        <div class="glare"></div>
        <div class="glass card-glass depth">
          <p class="card-meta">${esc(b.origin)}</p>
          <h3 class="card-name ${b.theme.font}">${esc(b.name)}</h3>
          <p class="card-line">${esc(b.line)}</p>
          <div class="card-actions">
            <button class="btn btn-accent" type="button" data-open-brand="${b.id}">Discover</button>
            <a class="btn-link" href="${b.url}" target="_blank" rel="noopener">Official site <span aria-hidden="true">&#8599;</span></a>
          </div>
        </div>
      </div>
    </article>`;

  const applyFilter = (cat, updateUrl) => {
    if (!grid) return;
    const cats = D.pages[page].categories.map(([id]) => id);
    if (!cats.includes(cat)) cat = "all";
    $$("[data-cat]").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.cat === cat)));
    $$(".brand-card", grid).forEach((card) => {
      const show = cat === "all" || card.dataset.tags.split(" ").includes(cat);
      card.classList.toggle("is-hidden", !show);
      if (show && updateUrl) {
        card.classList.add("is-in");
        card.classList.remove("pop");
        void card.offsetWidth;
        card.classList.add("pop");
      }
    });
    if (updateUrl) {
      const u = new URL(location.href);
      if (cat === "all") u.searchParams.delete("cat");
      else u.searchParams.set("cat", cat);
      history.replaceState(null, "", u);
    }
  };

  const visibleBrands = () =>
    $$(".brand-card:not(.is-hidden)", grid).map((c) => D.brands.find((b) => b.id === c.dataset.brand));

  const fillPanel = (b) => {
    current = b;
    panel.style.cssText = `--brand-accent:${b.theme.accent};--brand-deep:${b.theme.deep};--accent-ink:${b.theme.ink}`;
    const img = $(".panel-media img", panel);
    img.src = b.image;
    img.alt = b.imageAlt;
    img.style.objectPosition = b.focus;
    img.style.animation = "none";
    void img.offsetWidth;
    img.style.animation = "";
    $(".panel-meta", panel).textContent = b.origin;
    const name = $(".panel-name", panel);
    name.className = `panel-name ${b.theme.font}`;
    name.textContent = b.name;
    $(".panel-about", panel).textContent = b.about;
    $(".panel-list", panel).innerHTML = b.signatures.map((s) => `<li>${esc(s)}</li>`).join("");
    $(".panel-tags", panel).innerHTML = b.tags.map((t) => `<span class="tag">${esc(labelOf(b.page, t))}</span>`).join("");
    const cta = $(".panel-cta", panel);
    cta.href = b.url;
    cta.innerHTML = `Visit ${esc(b.name)} <span aria-hidden="true">&#8599;</span>`;
    panel.scrollTop = 0;
  };

  const openPanel = (id) => {
    const b = D.brands.find((x) => x.id === id && x.page === page);
    if (!b || !panel) return;
    if (!panel.classList.contains("is-open")) lastFocus = document.activeElement;
    fillPanel(b);
    panel.classList.add("is-open");
    panelScrim.classList.add("is-open");
    lock("panel", true);
    history.replaceState(null, "", `${location.pathname}${location.search}#${b.id}`);
    setTimeout(() => $(".panel-close", panel).focus({ preventScroll: true }), 80);
  };

  const closePanel = () => {
    if (!panel || !panel.classList.contains("is-open")) return;
    panel.classList.remove("is-open");
    panelScrim.classList.remove("is-open");
    lock("panel", false);
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };

  const stepPanel = (dir) => {
    const list = visibleBrands();
    const i = list.findIndex((b) => b === current);
    fillPanel(list[(i + dir + list.length) % list.length]);
    history.replaceState(null, "", `${location.pathname}${location.search}#${current.id}`);
  };

  if (grid && D.pages[page]) {
    const list = brandsOf(page);
    grid.innerHTML = list.map(cardHTML).join("");
    const filters = $("[data-filters]");
    filters.innerHTML = [["all", "All houses"], ...D.pages[page].categories]
      .map(([id, label]) => {
        const n = id === "all" ? list.length : list.filter((b) => b.tags.includes(id)).length;
        return `<button class="chip" type="button" data-cat="${id}" aria-pressed="false">${esc(label)} <span class="count">${n}</span></button>`;
      })
      .join("");
    filters.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-cat]");
      if (chip) applyFilter(chip.dataset.cat, true);
    });
    grid.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      const card = e.target.closest(".brand-card");
      if (card) openPanel(card.dataset.brand);
    });
    applyFilter(new URLSearchParams(location.search).get("cat") || "all", false);
  }

  if (panel) {
    panel.addEventListener("click", (e) => {
      if (e.target.closest("[data-panel-close]")) closePanel();
      else if (e.target.closest("[data-panel-prev]")) stepPanel(-1);
      else if (e.target.closest("[data-panel-next]")) stepPanel(1);
    });
    panelScrim.addEventListener("click", closePanel);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closePanel();
    if (window.vitrineCloseMenu) window.vitrineCloseMenu();
  });

  // Links that point at the page we're already on (menu, mega, marquee): apply them in place.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.getAttribute("href"), location.href);
    const here = (p) => p.replace(/\/index\.html$/, "/");
    if (url.origin !== location.origin || here(url.pathname) !== here(location.pathname)) return;
    e.preventDefault();
    if (window.vitrineCloseMenu) window.vitrineCloseMenu();
    const id = url.hash.slice(1);
    const brandHere = D.brands.some((b) => b.id === id && b.page === page);
    if (grid && brandHere) {
      closePanel();
      applyFilter("all", true);
      scrollToEl($("#houses"));
      setTimeout(() => openPanel(id), 450);
    } else if (grid && !url.hash) {
      closePanel();
      applyFilter(url.searchParams.get("cat") || "all", true);
      scrollToEl($("#houses"));
    } else if (url.hash) {
      scrollToEl(document.getElementById(id));
    } else {
      if (lenis) lenis.scrollTo(0);
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  /* ---------- marquee of houses (home) ---------- */

  const track = $("[data-marquee-track]");
  if (track) {
    const items = D.brands
      .map((b) => `<a class="${b.theme.font}" style="${vars(b)}" href="${brandHref(b)}">${esc(b.name)}</a>`)
      .join("");
    track.innerHTML = items + items.replace(/<a /g, '<a aria-hidden="true" tabindex="-1" ');
  }

  /* ---------- 3D tilt with depth ---------- */

  if (finePointer && !reduceMotion) {
    $$("[data-tilt]").forEach((el) => {
      const host = el.closest(".tilt") || el;
      const max = parseFloat(el.dataset.tiltMax || 9);
      let raf = 0;
      let px = 0;
      let py = 0;
      const paint = () => {
        raf = 0;
        el.style.transform = `rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
        el.style.setProperty("--mx", px.toFixed(3));
        el.style.setProperty("--my", py.toFixed(3));
        el.style.setProperty("--gx", `${((px + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty("--gy", `${((py + 0.5) * 100).toFixed(1)}%`);
      };
      const queue = () => {
        if (!raf) raf = requestAnimationFrame(paint);
      };
      host.addEventListener("pointerenter", () => host.classList.add("is-tilting"));
      host.addEventListener("pointermove", (e) => {
        const r = host.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width - 0.5;
        py = (e.clientY - r.top) / r.height - 0.5;
        queue();
      });
      host.addEventListener("pointerleave", () => {
        host.classList.remove("is-tilting");
        px = 0;
        py = 0;
        queue();
      });
    });

    const depthEls = $$("[data-depth]");
    let raf = 0;
    let mx = 0;
    let my = 0;
    window.addEventListener(
      "pointermove",
      (e) => {
        mx = e.clientX / innerWidth - 0.5;
        my = e.clientY / innerHeight - 0.5;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          depthEls.forEach((el) => {
            const d = parseFloat(el.dataset.depth);
            el.style.translate = `${(-mx * d).toFixed(1)}px ${(-my * d).toFixed(1)}px`;
          });
        });
      },
      { passive: true }
    );
  }

  /* ---------- films: full screen, looping; opened by the 3D objects, campaigns and film tiles ---------- */

  let filmBox = null;
  const closeFilm = () => {
    if (!filmBox || !filmBox.open) return;
    $("video", filmBox).pause();
    filmBox.close();
    lock("film", false);
  };
  const openFilm = (key) => {
    const f = D.films && D.films[key];
    if (!f) return;
    if (!filmBox) {
      filmBox = document.createElement("dialog");
      filmBox.className = "film";
      filmBox.setAttribute("aria-label", "Film");
      filmBox.innerHTML = `
        <video muted loop playsinline autoplay preload="none"></video>
        <div class="film-cap">
          <div><p class="eyebrow"></p><h2 class="film-title"></h2></div>
          <a class="btn btn-light"></a>
        </div>
        <button class="icon-btn film-close" type="button" aria-label="Close the film">&times;</button>`;
      document.body.append(filmBox);
      // close first, so a link inside (e.g. "#houses") can scroll the unlocked page
      filmBox.addEventListener("click", (e) => {
        if (e.target.closest(".film-close, a")) closeFilm();
      });
      // Esc: close through the same path (the dialog's own "close" event is async and not always delivered)
      filmBox.addEventListener("cancel", (e) => {
        e.preventDefault();
        closeFilm();
      });
    }
    const v = $("video", filmBox);
    if (v.getAttribute("src") !== f.src) {
      v.poster = f.poster;
      v.src = f.src;
    }
    $(".eyebrow", filmBox).textContent = f.kicker;
    $(".film-title", filmBox).textContent = f.title;
    const cta = $("a", filmBox);
    cta.href = f.href;
    cta.textContent = f.cta;
    filmBox.showModal();
    lock("film", true);
    v.play().catch(() => {});
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-film]");
    if (t && !e.target.closest("a, .film")) openFilm(t.dataset.film);
  });

  /* ---------- inline videos play only while on screen (poster only with reduced motion) ---------- */

  if (!reduceMotion && "IntersectionObserver" in window) {
    const vio = new IntersectionObserver(
      (entries) => entries.forEach(({ target, isIntersecting }) => (isIntersecting ? target.play().catch(() => {}) : target.pause())),
      { rootMargin: "150px 0px" }
    );
    $$("video[data-autoplay]").forEach((v) => vio.observe(v));
  }

  /* ---------- rails: horizontal carousel with dots and arrows ---------- */

  $$("[data-rail]").forEach((rail) => {
    const nav = rail.nextElementSibling;
    const items = [...rail.children];
    const dots = $(".rail-dots", nav);
    dots.innerHTML = items.map((_, i) => `<button type="button" aria-label="Show item ${i + 1}"></button>`).join("");
    const pos = (i) => items[i].offsetLeft - items[0].offsetLeft;
    const max = () => rail.scrollWidth - rail.clientWidth;
    let cur = 0;
    let last = items.length - 1;
    // one dot per position the rail can actually reach (several cards share the end position on wide screens)
    const layout = () => {
      last = items.findIndex((_, i) => pos(i) >= max() - 4);
      if (last < 0) last = items.length - 1;
      [...dots.children].forEach((d, i) => (d.hidden = i > last));
    };
    const setDot = (a) => {
      cur = a;
      [...dots.children].forEach((d, i) => d.setAttribute("aria-current", String(i === a)));
    };
    const mark = () => {
      let best = 0;
      for (let i = 1; i <= last; i++) {
        if (Math.abs(Math.min(pos(i), max()) - rail.scrollLeft) < Math.abs(Math.min(pos(best), max()) - rail.scrollLeft)) best = i;
      }
      setDot(best);
    };
    const go = (i) => {
      i = Math.max(0, Math.min(last, i));
      rail.scrollTo({ left: Math.min(pos(i), max()), behavior: reduceMotion ? "auto" : "smooth" });
      setDot(i);
    };
    nav.addEventListener("click", (e) => {
      const d = e.target.closest(".rail-dots button");
      if (d) go([...dots.children].indexOf(d));
      else if (e.target.closest("[data-rail-prev]")) go(cur - 1);
      else if (e.target.closest("[data-rail-next]")) go(cur + 1);
    });
    rail.addEventListener("scroll", mark, { passive: true });
    window.addEventListener("resize", () => {
      layout();
      mark();
    });
    layout();
    mark();
  });

  /* ---------- reveal on scroll ---------- */

  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }),
      { rootMargin: "0px 0px -6% 0px", threshold: 0.1 }
    );
    $$(".reveal").forEach((el) => io.observe(el));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("is-in"));
  }

  const initialId = location.hash.slice(1);
  if (grid && initialId) setTimeout(() => openPanel(initialId), 300);
})();
