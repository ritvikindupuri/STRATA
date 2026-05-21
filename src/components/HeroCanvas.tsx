import { useEffect, useRef } from "react";

/**
 * Interactive layered-grid hero. Renders a 3D-ish isometric grid of "strata"
 * with traveling packets and occasional intercepted threat pulses. Reacts to
 * pointer position. Pure canvas — no deps.
 */
export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pointer = { x: 0.5, y: 0.5, active: false };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width;
      pointer.y = (e.clientY - r.top) / r.height;
      pointer.active = true;
    };
    const onLeave = () => { pointer.active = false; };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    type Packet = { layer: number; t: number; speed: number; threat: boolean };
    const LAYERS = 5;
    const packets: Packet[] = [];
    for (let i = 0; i < 18; i++) {
      packets.push({
        layer: Math.floor(Math.random() * LAYERS),
        t: Math.random(),
        speed: 0.04 + Math.random() * 0.08,
        threat: Math.random() < 0.18,
      });
    }

    const cyan = "200 0.16 0.82";
    const violet = "295 0.22 0.65";
    const red = "20 0.25 0.65";

    let time = 0;
    const draw = (dt: number) => {
      time += dt;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const baseY = h * 0.62;
      const layerGap = Math.min(h * 0.085, 46);
      const widest = Math.min(w * 0.78, 820);

      // Faint scan sweep
      const sweep = (Math.sin(time * 0.0006) + 1) / 2;
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(Math.max(0, sweep - 0.15), `oklch(0.82 0.16 200 / 0)`);
      grad.addColorStop(sweep, `oklch(0.82 0.16 200 / 0.06)`);
      grad.addColorStop(Math.min(1, sweep + 0.15), `oklch(0.82 0.16 200 / 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Layers (back to front)
      for (let i = LAYERS - 1; i >= 0; i--) {
        const depth = i / (LAYERS - 1); // 0 = front, 1 = back
        const lw = widest * (1 - depth * 0.55);
        const y = baseY - i * layerGap - (pointer.active ? (pointer.y - 0.5) * 18 * (1 - depth) : 0);
        const tilt = (pointer.active ? (pointer.x - 0.5) * 80 * (1 - depth) : 0);
        const x0 = cx - lw / 2 + tilt;
        const x1 = cx + lw / 2 + tilt;
        const alpha = 0.18 + (1 - depth) * 0.45;

        // Layer line
        ctx.strokeStyle = `oklch(0.82 0.16 200 / ${alpha})`;
        ctx.lineWidth = 1 + (1 - depth);
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();

        // Layer label
        ctx.fillStyle = `oklch(0.70 0.02 250 / ${0.35 + (1 - depth) * 0.35})`;
        ctx.font = `${10 + (1 - depth) * 1.5}px "JetBrains Mono", monospace`;
        const labels = ["L1 · IAM", "L2 · API", "L3 · NETWORK", "L4 · DATA", "L5 · CONTROL"];
        ctx.fillText(labels[i], x0 - 6, y - 6);

        // Tick marks
        for (let k = 0; k <= 10; k++) {
          const tx = x0 + (lw * k) / 10;
          ctx.beginPath();
          ctx.moveTo(tx, y - 3);
          ctx.lineTo(tx, y + 3);
          ctx.strokeStyle = `oklch(0.82 0.16 200 / ${alpha * 0.4})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Vertical connectors between layers (every n ticks)
      for (let k = 0; k <= 10; k++) {
        const tx0 = cx - widest / 2 + (widest * k) / 10 + (pointer.active ? (pointer.x - 0.5) * 80 : 0);
        ctx.beginPath();
        ctx.moveTo(tx0, baseY);
        const tilt = (pointer.active ? (pointer.x - 0.5) * 80 * 0 : 0);
        const lwTop = widest * (1 - 0.55);
        const txTop = cx - lwTop / 2 + (lwTop * k) / 10 + tilt;
        ctx.lineTo(txTop, baseY - (LAYERS - 1) * layerGap);
        ctx.strokeStyle = `oklch(0.82 0.16 200 / 0.04)`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Packets traveling along layers
      for (const p of packets) {
        p.t += p.speed * (dt / 1000);
        if (p.t > 1) { p.t = 0; p.threat = Math.random() < 0.18; p.layer = Math.floor(Math.random() * LAYERS); }
        const depth = p.layer / (LAYERS - 1);
        const lw = widest * (1 - depth * 0.55);
        const y = baseY - p.layer * layerGap;
        const tilt = (pointer.active ? (pointer.x - 0.5) * 80 * (1 - depth) : 0);
        const x = cx - lw / 2 + lw * p.t + tilt;
        const color = p.threat ? red : (p.layer % 2 ? violet : cyan);
        const r = p.threat ? 3.5 : 2;

        // Trail
        const trailGrad = ctx.createLinearGradient(x - 30, y, x, y);
        trailGrad.addColorStop(0, `oklch(${color} / 0)`);
        trailGrad.addColorStop(1, `oklch(${color} / 0.7)`);
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = p.threat ? 2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(x - 30, y);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Dot
        ctx.fillStyle = `oklch(${color})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        if (p.threat) {
          // Pulse ring
          const ring = (p.t * 2) % 1;
          ctx.strokeStyle = `oklch(${color} / ${1 - ring})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(x, y, 4 + ring * 14, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - last); last = now;
      draw(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}
