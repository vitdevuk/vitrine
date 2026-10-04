// Real-time 3D hero objects: a faceted diamond (home, jewellery) and a perfume bottle (beauty).
(() => {
  const canvases = [...document.querySelectorAll("canvas[data-scene]")];
  if (!canvases.length) return;
  if (!window.THREE) {
    canvases.forEach((c) => c.classList.add("is-off"));
    return;
  }

  const THREE = window.THREE;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  // A small softbox studio rendered into an environment map — gives the facets something to reflect.
  function studioEnvironment(renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new THREE.Scene();
    room.background = new THREE.Color(0x151413);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const softbox = (color, power, w, h, x, y, z) => {
      const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power) }));
      m.scale.set(w, h, 0.1);
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      room.add(m);
    };
    softbox(0xffffff, 12, 6, 0.6, 0, 6, 2);
    softbox(0xfff0dc, 8, 0.6, 5, -6, 1, 1.5);
    softbox(0xe6eeff, 8, 0.6, 5, 6, 0.5, -1.5);
    softbox(0xffffff, 1.4, 2.5, 1.6, 0, -0.5, 7);
    softbox(0xffe1b5, 1.5, 8, 0.4, 0, -5, 0);
    // a scatter of small point sources: as the stone turns, individual facets catch them and flash
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++) {
      const t = rand() * Math.PI * 2;
      const p = Math.acos(2 * rand() - 1);
      const r = 6.5;
      const s = 0.18 + rand() * 0.4;
      softbox(rand() > 0.8 ? 0xffe6c4 : 0xffffff, 10 + rand() * 18, s, s, r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
    }
    const env = pmrem.fromScene(room, 0.004).texture;
    pmrem.dispose();
    box.dispose();
    return env;
  }

  function diamondMatcap() {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(236, 210, 10, 256, 256, 262);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.3, "#c9d6e6");
    g.addColorStop(0.62, "#3a4658");
    g.addColorStop(1, "#07090c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 170; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const s = 6 + rand() * 44;
      const k = rand();
      ctx.fillStyle =
        k > 0.86 ? `hsla(${Math.floor(rand() * 360)}, 85%, 72%, 0.85)` : k > 0.42 ? "rgba(255,255,255,0.92)" : "rgba(4,6,10,0.8)";
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s * 0.6, y);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s * 0.6, y);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function makeDiamond() {
    // Brilliant-cut profile: culet → pavilion → girdle → crown → table.
    const profile = [
      [0.001, -1.0],
      [0.22, -0.84],
      [0.5, -0.56],
      [0.78, -0.28],
      [1.0, -0.04],
      [1.0, 0.03],
      [0.9, 0.14],
      [0.74, 0.26],
      [0.56, 0.35],
      [0.001, 0.35],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const geometry = new THREE.LatheGeometry(profile, 16);
    // Each flat facet samples one point of this matcap, so a speckled high-contrast map makes
    // neighbouring facets flash white, black or a touch of colour as the stone turns — the "fire" of a diamond.
    const material = new THREE.MeshMatcapMaterial({ matcap: diamondMatcap(), flatShading: true, side: THREE.DoubleSide });
    const gem = new THREE.Mesh(geometry, material);
    gem.position.y = 0.32;
    const holder = new THREE.Group();
    holder.add(gem);
    holder.rotation.x = 0.42;
    holder.scale.setScalar(1.12);
    return { object: holder, spin: gem, speed: 0.42 };
  }

  function roundedRect(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  function slab(w, h, d, r, bevel) {
    const g = new THREE.ExtrudeGeometry(roundedRect(w, h, r), {
      depth: d,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      curveSegments: 10,
    });
    g.center();
    return g;
  }

  function labelTexture() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 300;
    const ctx = c.getContext("2d");
    const draw = () => {
      ctx.clearRect(0, 0, 512, 300);
      ctx.fillStyle = "rgba(247, 243, 235, 0.94)";
      ctx.fillRect(0, 0, 512, 300);
      ctx.strokeStyle = "rgba(21, 20, 18, 0.55)";
      ctx.lineWidth = 3;
      ctx.strokeRect(16, 16, 480, 268);
      ctx.fillStyle = "#151412";
      ctx.textAlign = "center";
      ctx.font = '600 70px "Cormorant Garamond", Georgia, serif';
      ctx.fillText("VITRINE", 256, 148);
      ctx.font = '400 20px "Outfit", Arial, sans-serif';
      ctx.fillText("E A U   D E   P A R F U M", 256, 206);
    };
    draw();
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    if (document.fonts) {
      document.fonts.ready.then(() => {
        draw();
        tex.needsUpdate = true;
      });
    }
    return tex;
  }

  function makeBottle(env) {
    const group = new THREE.Group();
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.04,
      transparent: true,
      opacity: 0.3,
      envMap: env,
      envMapIntensity: 2.6,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      ior: 1.5,
      specularIntensity: 1,
      depthWrite: false,
    });
    const body = new THREE.Mesh(slab(1.25, 1.45, 0.62, 0.14, 0.07), glass);
    body.renderOrder = 2;

    const liquid = new THREE.Mesh(
      slab(1.05, 1.0, 0.44, 0.1, 0.04),
      new THREE.MeshPhysicalMaterial({
        color: 0xe7b47a,
        metalness: 0,
        roughness: 0.18,
        transparent: true,
        opacity: 0.9,
        envMap: env,
        envMapIntensity: 1.2,
        clearcoat: 0.6,
      })
    );
    liquid.position.y = -0.17;
    liquid.renderOrder = 1;

    const gold = new THREE.MeshPhysicalMaterial({ color: 0xd8b26a, metalness: 1, roughness: 0.22, envMap: env, envMapIntensity: 1.7 });
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.18, 48), gold);
    neck.position.y = 0.87;

    const cap = new THREE.Mesh(
      slab(0.56, 0.4, 0.5, 0.06, 0.035),
      new THREE.MeshPhysicalMaterial({
        color: 0x151412,
        metalness: 0.3,
        roughness: 0.16,
        envMap: env,
        envMapIntensity: 1.5,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      })
    );
    cap.position.y = 1.17;

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.375),
      new THREE.MeshBasicMaterial({ map: labelTexture(), transparent: true })
    );
    label.position.set(0, -0.04, 0.385);
    label.renderOrder = 3;

    group.add(liquid, body, label, neck, cap);
    group.position.y = -0.22;
    const holder = new THREE.Group();
    holder.add(group);
    holder.scale.setScalar(1.12);
    return { object: holder, spin: group, speed: 0.34 };
  }

  function starTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.22, "rgba(255,248,235,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(31, 4, 2, 56);
    ctx.fillRect(4, 31, 56, 2);
    return new THREE.CanvasTexture(c);
  }

  function makeSparkles(count) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 1.55 + Math.random() * 1.1;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.cos(p) * 0.85;
      pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
      phase[i] = Math.random() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.17,
        map: starTexture(),
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    points.userData.phase = phase;
    return points;
  }

  function twinkle(points, t) {
    const col = points.geometry.attributes.color;
    const phase = points.userData.phase;
    for (let i = 0; i < phase.length; i++) {
      const v = Math.pow(Math.max(0, Math.sin(t * 1.5 + phase[i])), 8);
      col.array[i * 3] = v;
      col.array[i * 3 + 1] = v * 0.95;
      col.array[i * 3 + 2] = v * 0.86;
    }
    col.needsUpdate = true;
  }

  function init(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 0, 7.4);

    const env = studioEnvironment(renderer);
    scene.environment = env;
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const key = new THREE.PointLight(0xffffff, 2.2, 20);
    key.position.set(3, 4, 5);
    const rim = new THREE.PointLight(0xffe0b3, 1.6, 20);
    rim.position.set(-4, -1, -3);
    scene.add(key, rim);

    const kind = canvas.dataset.scene;
    const hero = kind === "bottle" ? makeBottle(env) : makeDiamond(env);
    const stage = new THREE.Group();
    stage.add(hero.object);
    scene.add(stage);
    const sparkles = makeSparkles(kind === "bottle" ? 28 : 48);
    scene.add(sparkles);

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!running) renderer.render(scene, camera);
    };

    let running = false;
    let visible = true;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let spin = 0;
    let boost = 1;
    const host = canvas.closest("[data-film]");
    let lastY = window.scrollY;
    const clock = new THREE.Clock();

    const frame = () => {
      if (!visible || document.hidden) {
        running = false;
        return;
      }
      requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const y = window.scrollY;
      spin += (y - lastY) * 0.004;
      lastY = y;
      spin *= 0.9;
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;
      // hovering the object (it opens the film) spins it up
      boost += ((host && host.matches(":hover") ? 3.5 : 1) - boost) * 0.06;
      hero.spin.rotation.y += dt * hero.speed * boost + spin;
      stage.rotation.x = cy * 0.45;
      stage.rotation.z = -cx * 0.22;
      stage.position.y = Math.sin(t * 1.1) * 0.09;
      twinkle(sparkles, t);
      sparkles.rotation.y = t * 0.05;
      renderer.render(scene, camera);
    };

    const start = () => {
      if (running || !visible || document.hidden || reduceMotion) return;
      running = true;
      clock.getDelta();
      requestAnimationFrame(frame);
    };

    new ResizeObserver(resize).observe(canvas);
    resize();

    if (reduceMotion) {
      hero.spin.rotation.y = 0.6;
      twinkle(sparkles, 1.2);
      renderer.render(scene, camera);
      return;
    }

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    }).observe(canvas);
    document.addEventListener("visibilitychange", start);
    window.addEventListener(
      "pointermove",
      (e) => {
        tx = e.clientX / window.innerWidth - 0.5;
        ty = e.clientY / window.innerHeight - 0.5;
      },
      { passive: true }
    );
    start();
  }

  canvases.forEach((canvas) => {
    try {
      init(canvas);
    } catch (err) {
      canvas.classList.add("is-off");
      console.warn("Vitrine 3D disabled:", err);
    }
  });
})();
