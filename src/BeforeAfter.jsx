import { useEffect, useRef, useState } from "react";

export default function BeforeAfter({
  beforeSrc,
  afterSrc,
  initial = 50,
  autoplay = true,
  min = 20,
  max = 80,
  speed = 0.25,
  interval = 40,
  className = ""
}) {
  const [pos, setPos] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const dirRef = useRef(1);
  const wrapRef = useRef(null);

  // autoplay ping-pong
  useEffect(() => {
    if (!autoplay) return;
    if (dragging || hovering) return; // pausa enquanto arrasta/hover
    const id = setInterval(() => {
      setPos((p) => {
        let next = p + dirRef.current * speed;
        if (next >= max) { next = max; dirRef.current = -1; }
        if (next <= min) { next = min; dirRef.current = 1; }
        return next;
      });
    }, interval);
    return () => clearInterval(id);
  }, [autoplay, dragging, hovering, min, max, speed, interval]);

  // pega posição (%) do cursor/toque
  const pctFromEvent = (e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    return Math.min(100, Math.max(0, (x / rect.width) * 100));
  };

  const startDrag = (e) => {
    e.preventDefault();
    setDragging(true);
    setPos(pctFromEvent(e));
    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchend", endDrag);
  };
  const onMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    setPos(pctFromEvent(e));
  };
  const endDrag = () => {
    setDragging(false);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("mouseup", endDrag);
    window.removeEventListener("touchend", endDrag);
  };

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden rounded-2xl bg-black select-none ${className}`}
      style={{ touchAction: "none" }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* camada "depois" */}
      <img src={afterSrc} alt="Depois" className="absolute inset-0 w-full h-full object-cover" draggable="false" />
      {/* camada "antes" recortada por largura em % */}
      <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img src={beforeSrc} alt="Antes" className="absolute inset-0 w-full h-full object-cover" draggable="false" />
      </div>

      {/* divisor + botão de arrasto */}
      <div className="absolute inset-y-0" style={{ left: `${pos}%`, transform: "translateX(-50%)" }}>
        <div className="h-full w-[2px] bg-white/80 pointer-events-none" />
        <button
          aria-label="Arrastar comparação"
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 rounded-full bg-white/95 shadow hover:scale-110 active:scale-110 transition"
          style={{ transform: "translate(-50%, -50%)" }}
        />
      </div>

      {/* etiquetas opcionais */}
      <div className="absolute top-2 left-2 text-xs font-semibold bg-black/60 text-white px-2 py-1 rounded">ANTES</div>
      <div className="absolute top-2 right-2 text-xs font-semibold bg-black/60 text-white px-2 py-1 rounded">DEPOIS</div>
    </div>
  );
}
