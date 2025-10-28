import React, { useEffect, useRef } from 'react';
import './ParticleSystem.css';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  type: 'oil-drop' | 'leaf' | 'sparkle' | 'bubble';
  rotation: number;
  rotationSpeed: number;
}

interface ParticleSystemProps {
  particleCount?: number;
  particleTypes?: ('oil-drop' | 'leaf' | 'sparkle' | 'bubble')[];
  intensity?: 'low' | 'medium' | 'high';
  color?: string;
  className?: string;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({
  particleCount = 20,
  particleTypes = ['oil-drop', 'leaf', 'sparkle'],
  intensity = 'medium',
  color = '#059669',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const intensityMultiplier = {
    low: 0.5,
    medium: 1,
    high: 1.5
  }[intensity];

  const createParticle = (id: number): Particle => {
    const canvas = canvasRef.current;
    if (!canvas) return {} as Particle;

    const type = particleTypes[Math.floor(Math.random() * particleTypes.length)];
    
    return {
      id,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5 * intensityMultiplier,
      vy: (Math.random() - 0.5) * 0.5 * intensityMultiplier,
      size: Math.random() * 8 + 4,
      opacity: Math.random() * 0.6 + 0.2,
      type,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 2
    };
  };

  const updateParticle = (particle: Particle, deltaTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Update position
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;

    // Update rotation
    particle.rotation += particle.rotationSpeed * deltaTime;

    // Boundary checking with smooth wrapping
    if (particle.x < -particle.size) particle.x = canvas.width + particle.size;
    if (particle.x > canvas.width + particle.size) particle.x = -particle.size;
    if (particle.y < -particle.size) particle.y = canvas.height + particle.size;
    if (particle.y > canvas.height + particle.size) particle.y = -particle.size;

    // Add subtle floating motion
    particle.y += Math.sin(Date.now() * 0.001 + particle.id) * 0.1 * deltaTime;
    particle.x += Math.cos(Date.now() * 0.001 + particle.id) * 0.05 * deltaTime;
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate((particle.rotation * Math.PI) / 180);
    ctx.globalAlpha = particle.opacity;

    switch (particle.type) {
      case 'oil-drop':
        drawOilDrop(ctx, particle.size, color);
        break;
      case 'leaf':
        drawLeaf(ctx, particle.size, color);
        break;
      case 'sparkle':
        drawSparkle(ctx, particle.size, color);
        break;
      case 'bubble':
        drawBubble(ctx, particle.size, color);
        break;
    }

    ctx.restore();
  };

  const drawOilDrop = (ctx: CanvasRenderingContext2D, size: number, color: string) => {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.7, `${color}80`);
    gradient.addColorStop(1, `${color}20`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 1.2, 0, 0, 2 * Math.PI);
    ctx.fill();

    // Add highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-size * 0.3, -size * 0.3, size * 0.3, size * 0.4, 0, 0, 2 * Math.PI);
    ctx.fill();
  };

  const drawLeaf = (ctx: CanvasRenderingContext2D, size: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.6, 0, 0, 2 * Math.PI);
    ctx.fill();

    // Add leaf veins
    ctx.strokeStyle = `${color}60`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(0, size * 0.6);
    ctx.moveTo(-size * 0.3, -size * 0.3);
    ctx.lineTo(size * 0.3, size * 0.3);
    ctx.moveTo(size * 0.3, -size * 0.3);
    ctx.lineTo(-size * 0.3, size * 0.3);
    ctx.stroke();
  };

  const drawSparkle = (ctx: CanvasRenderingContext2D, size: number, color: string) => {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    // Draw star shape
    const spikes = 6;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.closePath();
    ctx.fill();
  };

  const drawBubble = (ctx: CanvasRenderingContext2D, size: number, color: string) => {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(0.7, `${color}40`);
    gradient.addColorStop(1, `${color}10`);

    ctx.fillStyle = gradient;
    ctx.strokeStyle = `${color}60`;
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Add bubble highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(-size * 0.3, -size * 0.3, size * 0.2, 0, 2 * Math.PI);
    ctx.fill();
  };

  const animate = (currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    particlesRef.current.forEach(particle => {
      updateParticle(particle, deltaTime);
      drawParticle(ctx, particle);
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Recreate particles for new dimensions
    particlesRef.current = Array.from({ length: particleCount }, (_, i) => createParticle(i));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize particles
    particlesRef.current = Array.from({ length: particleCount }, (_, i) => createParticle(i));

    // Start animation
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    // Handle resize
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [particleCount, particleTypes, intensity, color]);

  return (
    <canvas
      ref={canvasRef}
      className={`particle-system ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
};

export default ParticleSystem;
