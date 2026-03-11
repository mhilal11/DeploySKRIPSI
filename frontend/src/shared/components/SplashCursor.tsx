'use client';

import React, { useEffect, useRef } from 'react';

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

interface SplashCursorProps {
  SIM_RESOLUTION?: number;
  DYE_RESOLUTION?: number;
  CAPTURE_RESOLUTION?: number;
  DENSITY_DISSIPATION?: number;
  VELOCITY_DISSIPATION?: number;
  PRESSURE?: number;
  PRESSURE_ITERATIONS?: number;
  CURL?: number;
  SPLAT_RADIUS?: number;
  SPLAT_FORCE?: number;
  SHADING?: boolean;
  COLOR_UPDATE_SPEED?: number;
  BACK_COLOR?: ColorRGB;
  TRANSPARENT?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  hue: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function SplashCursor({
  DENSITY_DISSIPATION = 3.5,
  VELOCITY_DISSIPATION = 2,
  SPLAT_RADIUS = 0.2,
  SPLAT_FORCE = 6000,
  COLOR_UPDATE_SPEED = 10,
  BACK_COLOR = { r: 0.5, g: 0, b: 0 },
  TRANSPARENT = true,
}: SplashCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: TRANSPARENT });
    if (!ctx) return;

    let disposed = false;
    let rafId = 0;
    const particles: Particle[] = [];
    let hue = 0;
    let lastTime = performance.now();
    let pointerDown = false;
    let prevX = 0;
    let prevY = 0;

    const velocityDecay = clamp(1 - VELOCITY_DISSIPATION * 0.02, 0.7, 0.99);
    const lifeDecay = clamp(1 - DENSITY_DISSIPATION * 0.01, 0.88, 0.99);
    const splashCount = clamp(Math.round(8 + SPLAT_RADIUS * 28), 6, 26);
    const baseSize = clamp(2 + SPLAT_RADIUS * 18, 2, 14);
    const baseForce = clamp(SPLAT_FORCE / 2200, 0.6, 4.5);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(window.innerWidth * dpr);
      const height = Math.floor(window.innerHeight * dpr);
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnParticle = (x: number, y: number, vx: number, vy: number) => {
      particles.push({
        x,
        y,
        vx,
        vy,
        life: 1,
        size: baseSize * (0.7 + Math.random() * 0.7),
        hue: (hue + Math.random() * 26 - 13 + 360) % 360,
      });
    };

    const spawnSplash = (x: number, y: number, dx: number, dy: number) => {
      const dirX = dx * baseForce;
      const dirY = dy * baseForce;

      for (let i = 0; i < splashCount; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.2 + Math.random() * 1.8;
        const spread = baseSize * (0.5 + Math.random() * 1.8);
        const px = x + Math.cos(angle) * spread;
        const py = y + Math.sin(angle) * spread;
        const vx = dirX + Math.cos(angle) * speed;
        const vy = dirY + Math.sin(angle) * speed;
        spawnParticle(px, py, vx, vy);
      }

      if (particles.length > 900) {
        particles.splice(0, particles.length - 900);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      pointerDown = true;
      prevX = event.clientX;
      prevY = event.clientY;
      spawnSplash(event.clientX, event.clientY, 0, 0);
    };

    const onPointerMove = (event: PointerEvent) => {
      const x = event.clientX;
      const y = event.clientY;
      const dx = x - prevX;
      const dy = y - prevY;
      prevX = x;
      prevY = y;

      const distance = Math.hypot(dx, dy);
      if (distance < 0.5) return;

      const normalizedDX = dx / Math.max(distance, 1);
      const normalizedDY = dy / Math.max(distance, 1);
      const motionScale = clamp(distance * 0.16, 0.7, 3.5);

      spawnSplash(x, y, normalizedDX * motionScale, normalizedDY * motionScale);
      if (pointerDown) {
        spawnSplash(x, y, normalizedDX * motionScale * 0.8, normalizedDY * motionScale * 0.8);
      }
    };

    const onPointerUp = () => {
      pointerDown = false;
    };

    const clearFrame = (dt: number) => {
      if (TRANSPARENT) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = `rgba(${Math.round(BACK_COLOR.r * 255)}, ${Math.round(BACK_COLOR.g * 255)}, ${Math.round(BACK_COLOR.b * 255)}, ${clamp(0.03 * dt * 60, 0.01, 0.08)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.fillStyle = `rgba(${Math.round(BACK_COLOR.r * 255)}, ${Math.round(BACK_COLOR.g * 255)}, ${Math.round(BACK_COLOR.b * 255)}, 1)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const updateParticles = (dt: number) => {
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.vx *= velocityDecay;
        particle.vy *= velocityDecay;
        particle.x += particle.vx * dt * 60;
        particle.y += particle.vy * dt * 60;
        particle.life *= lifeDecay;

        if (particle.life < 0.03) {
          particles.splice(i, 1);
        }
      }
    };

    const drawParticles = () => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (const particle of particles) {
        const alpha = clamp(particle.life * 0.55, 0, 0.55);
        const radius = particle.size * (0.35 + particle.life);
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          radius,
        );
        gradient.addColorStop(0, `hsla(${particle.hue}, 95%, 68%, ${alpha})`);
        gradient.addColorStop(1, `hsla(${particle.hue}, 95%, 68%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const animate = (now: number) => {
      if (disposed) return;
      const dt = clamp((now - lastTime) / 1000, 0.001, 0.03);
      lastTime = now;
      hue = (hue + COLOR_UPDATE_SPEED * dt * 10) % 360;

      clearFrame(dt);
      updateParticles(dt);
      drawParticles();

      rafId = window.requestAnimationFrame(animate);
    };

    resize();
    rafId = window.requestAnimationFrame(animate);

    window.addEventListener('resize', resize);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [
    BACK_COLOR.b,
    BACK_COLOR.g,
    BACK_COLOR.r,
    COLOR_UPDATE_SPEED,
    DENSITY_DISSIPATION,
    SPLAT_FORCE,
    SPLAT_RADIUS,
    TRANSPARENT,
    VELOCITY_DISSIPATION,
  ]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1]"
    />
  );
}
