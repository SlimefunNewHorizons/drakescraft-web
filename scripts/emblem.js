/* The original DrakesCraft emblem sits in a shallow 3D medallion. A transparent
 * WebGL layer adds depth over the existing garden image, with a static fallback. */
(() => {
  "use strict";
  const canvas = document.querySelector("[data-emblem]");
  const stage = canvas?.closest(".op-stage");
  const T = window.THREE;
  if (!canvas || !stage || !T) return;
  let renderer;
  try {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    renderer = new T.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.4));
    renderer.setClearColor(0x000000, 0);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(38, 1, 0.1, 40);
    camera.position.set(0, 0, 7);
    const emblem = new T.Group();
    emblem.position.y = 0.15;
    scene.add(emblem);
    const metal = new T.MeshStandardMaterial({
      color: 0xe5bd72,
      roughness: 0.36,
      metalness: 0.76,
    });
    const face = new T.MeshStandardMaterial({
      color: 0x21142f,
      roughness: 0.65,
      metalness: 0.35,
    });
    const disc = new T.Mesh(new T.CylinderGeometry(0.98, 0.98, 0.13, 64), [
      metal,
      face,
      face,
    ]);
    disc.rotation.x = Math.PI / 2;
    emblem.add(disc);
    const rim = new T.Mesh(new T.TorusGeometry(0.98, 0.017, 8, 96), metal);
    rim.position.z = 0.074;
    emblem.add(rim);
    const orbits = new T.Group();
    orbits.position.y = 0.15;
    scene.add(orbits);
    [1.47, 1.77].forEach((radius, index) => {
      const ring = new T.Mesh(
        new T.TorusGeometry(radius, 0.009, 6, 100),
        new T.MeshBasicMaterial({
          color: index ? 0xa98ae8 : 0x82c9a5,
          transparent: true,
          opacity: 0.55,
        }),
      );
      ring.rotation.set(index ? 0.55 : -0.45, index ? -0.6 : 0.65, 0.25);
      orbits.add(ring);
    });
    scene.add(new T.AmbientLight(0xbba4e1, 1.6));
    const key = new T.DirectionalLight(0xffdfaa, 2.4);
    key.position.set(-2, 4, 5);
    scene.add(key);
    const fill = new T.DirectionalLight(0xa98ae8, 1.2);
    fill.position.set(3, 0, 2);
    scene.add(fill);

    let frame = 0;
    let visible = true;
    let paused = reduced.matches;
    let ready = false;
    let last = 0;
    let phase = 0;
    let disposed = false;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "op-motion";
    button.hidden = true;
    stage.append(button);

    /** Keep the visible label and assistive technology in the same state. */
    function updateMotionButton() {
      button.textContent = paused ? "Activar 3D" : "Pausar 3D";
      button.setAttribute(
        "aria-label",
        paused ? "Activar animación 3D" : "Pausar animación 3D",
      );
    }

    /** A failed frame must reveal the original image and stop all animation. */
    function showFallback(error) {
      ready = false;
      cancelAnimationFrame(frame);
      frame = 0;
      stage.classList.remove("has-webgl");
      button.hidden = true;
      if (error) console.warn("[portal] Emblema estático disponible.", error);
    }

    /** A single loop runs at most 30 fps, only while the hero is visible. */
    function tick(now) {
      frame = 0;
      if (!ready || disposed || !visible || document.hidden || paused) return;
      if (now - last >= 32) {
        phase += Math.min((now - last) / 1000, 0.05);
        last = now;
        emblem.rotation.y = Math.sin(phase * 0.45) * 0.38;
        emblem.rotation.x = Math.cos(phase * 0.35) * 0.1;
        emblem.position.y = 0.15 + Math.sin(phase * 0.65) * 0.07;
        orbits.rotation.z = phase * 0.035;
        try {
          renderer.render(scene, camera);
        } catch (error) {
          showFallback(error);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    }
    /** Avoid duplicate animation loops across focus, scroll and resize events. */
    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = performance.now();
      if (ready && !disposed && visible && !document.hidden && !paused)
        frame = requestAnimationFrame(tick);
    }
    /** Return success so the fallback is hidden only after a valid first frame. */
    function resize() {
      try {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height || disposed) return false;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        if (ready) {
          renderer.render(scene, camera);
          stage.classList.add("has-webgl");
          button.hidden = false;
        }
        return true;
      } catch (error) {
        showFallback(error);
        return false;
      }
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      sync();
    });
    intersection.observe(stage);
    document.addEventListener("visibilitychange", sync);
    button.addEventListener("click", () => {
      paused = !paused;
      updateMotionButton();
      sync();
    });
    function motionPreferenceChanged() {
      paused = reduced.matches;
      updateMotionButton();
      sync();
    }
    reduced.addEventListener("change", motionPreferenceChanged);
    updateMotionButton();
    new T.TextureLoader().load(
      "/assets/logo-drakescraft.png",
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        try {
          texture.colorSpace = T.SRGBColorSpace;
          const ratio = texture.image.width / texture.image.height;
          const height = 1.57;
          const logo = new T.Mesh(
            new T.PlaneGeometry(height * ratio, height),
            new T.MeshBasicMaterial({
              map: texture,
              transparent: true,
              depthWrite: false,
            }),
          );
          logo.position.z = 0.085;
          emblem.add(logo);
          ready = true;
          resize();
          updateMotionButton();
          sync();
        } catch (error) {
          texture.dispose();
          showFallback(error);
        }
      },
      undefined,
      () => showFallback(),
    );
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      showFallback();
    });
    window.addEventListener("pagehide", (event) => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (event.persisted) return;
      disposed = true;
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", motionPreferenceChanged);
      window.removeEventListener("pageshow", sync);
      scene.traverse((object) => {
        object.geometry?.dispose();
        for (const material of [object.material].flat()) {
          material?.map?.dispose();
          material?.dispose();
        }
      });
      renderer.dispose();
    });
    window.addEventListener("pageshow", sync);
  } catch (error) {
    stage.classList.remove("has-webgl");
    renderer?.dispose();
    console.warn("[portal] Emblema estático; WebGL no disponible.", error);
  }
})();
