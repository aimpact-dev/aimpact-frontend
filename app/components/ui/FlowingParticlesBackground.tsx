import React, { useEffect, useRef } from 'react';

export const FlowingParticlesBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const numParticles = 20;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles = Array.from({ length: numParticles }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 5 + 0.5,
      speedX: 2 + Math.random() * 5,
      speedY: (Math.random() - 0.5) * 0.5,
      color: `hsla(${260 + Math.random() * 60}, 80%, 70%, ${Math.random() * 0.7})`,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15;
        ctx.filter = "blur(2.5px)";
        ctx.shadowColor = p.color;
        ctx.fill();

        p.x += p.speedX;
        p.y += p.speedY;

        // Bounce vertically within current height
        if (p.y < 0 || p.y > height) p.speedY *= -1;

        // Reset if moving off right edge
        if (p.x > width) p.x = -p.size;
      }

      requestAnimationFrame(draw);
    };

    draw();

    // --- New: Observe actual canvas size changes ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height;

        if (newWidth !== width || newHeight !== height) {
          const heightRatio = newHeight / height;

          // Adjust y positions proportionally (avoid stretching)
          for (const p of particles) {
            p.y *= heightRatio;
            p.speedY = (Math.random() - 0.5) * 0.5; // small re-randomization
          }

          width = canvas.width = newWidth;
          height = canvas.height = newHeight;
        }
      }
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};
