import { useEffect, useRef } from "react";

/**
 * Layered-grid hero. Renders concentric strata with traveling packets and
 * occasional intercepted threat pulses. Pointer-reactive. Pure canvas.
 */
export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    for (let i = 0; i < 22; i++) {
      packets.push({
        layer: Math.floor(Math.random() * LAYERS),
        t: Math.random(),
        speed: 0.05 + Math.random() * 0.09,
        threat: Math.random() < 0.16,
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
      grad.addColorStop(sweep, `oklch(0.82 0.16 200 / 0.05)`);
      grad.addColorStop(Math.min(1, sweep + 0.15), `oklch(0.82 0.16 200 / 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Layers (back to front) — no text labels, just clean strata
      for (let i = LAYERS - 1; i >= 0; i--) {
        const depth = i / (LAYERS - 1);
        const lw = widest * (1 - depth * 0.55);
        const y = baseY - i * layerGap - (pointer.active ? (pointer.y - 0.5) * 18 * (1 - depth) : 0);
        const tilt = (pointer.active ? (pointer.x - 0.5) * 80 * (1 - depth) : 0);
        const x0 = cx - lw / 2 + tilt;
        const x1 = cx + lw / 2 + tilt;
        const alpha = 0.15 + (1 - depth) * 0.4;

        ctx.strokeStyle = `oklch(0.82 0.16 200 / ${alpha})`;
        ctx.lineWidth = 1 + (1 - depth) * 0.6;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();

        // Endpoint nodes
        for (const ex of [x0, x1]) {
          ctx.fillStyle = `oklch(0.82 0.16 200 / ${alpha + 0.2})`;
          ctx.beginPath();
          ctx.arc(ex, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Packets
      for (const p of packets) {
        p.t += p.speed * (dt / 1000);
        if (p.t > 1) { p.t = 0; p.threat = Math.random() < 0.16; p.layer = Math.floor(Math.random() * LAYERS); }
        const depth = p.layer / (LAYERS - 1);
        const lw = widest * (1 - depth * 0.55);
        const y = baseY - p.layer * layerGap;
        const tilt = (pointer.active ? (pointer.x - 0.5) * 80 * (1 - depth) : 0);
        const x = cx - lw / 2 + lw * p.t + tilt;
        const color = p.threat ? red : (p.layer % 2 ? violet : cyan);
        const r = p.threat ? 3.5 : 2;

        const trailGrad = ctx.createLinearGradient(x - 34, y, x, y);
        trailGrad.addColorStop(0, `oklch(${color} / 0)`);
        trailGrad.addColorStop(1, `oklch(${color} / 0.75)`);
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = p.threat ? 2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(x - 34, y);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.fillStyle = `oklch(${color})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        if (p.threat) {
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
