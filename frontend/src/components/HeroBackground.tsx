import { useEffect, useRef } from 'react';

export const HeroBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let mouseX = -1000;
        let mouseY = -1000;
        
        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
            initParticles();
        };

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            baseX: number;
            baseY: number;
            density: number;
            color: string;
            alpha: number;
            pulseSpeed: number;
            
            constructor() {
                this.x = Math.random() * canvas!.width;
                this.y = Math.random() * canvas!.height;
                this.baseX = this.x;
                this.baseY = this.y;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = (Math.random() - 0.5) * 0.3;
                this.size = Math.random() * 2 + 0.5;
                this.density = (Math.random() * 30) + 1;
                this.alpha = Math.random() * 0.5 + 0.2;
                this.pulseSpeed = 0.02 + Math.random() * 0.02;
                
                // Tech colors
                const colors = ['#2AABEE', '#00D4FF', '#FFFFFF'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Pulse effect
                this.alpha += Math.sin(Date.now() * 0.001 * this.density) * 0.01;
                this.alpha = Math.max(0.1, Math.min(0.8, this.alpha));

                // Boundary check - wrap around for continuous flow
                if (this.x < 0) this.x = canvas!.width;
                if (this.x > canvas!.width) this.x = 0;
                if (this.y < 0) this.y = canvas!.height;
                if (this.y > canvas!.height) this.y = 0;

                // Mouse interaction - Repulsion with ease
                const dx = mouseX - this.x;
                const dy = mouseY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = 150;

                if (distance < maxDistance) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (maxDistance - distance) / maxDistance;
                    const directionX = forceDirectionX * force * this.density * 0.6;
                    const directionY = forceDirectionY * force * this.density * 0.6;
                    this.x -= directionX;
                    this.y -= directionY;
                }
            }

            draw() {
                if (!ctx) return;
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Glow effect
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.color;
            }
        }

        const initParticles = () => {
            particles = [];
            // Responsive particle count
            const particleCount = Math.min(Math.floor((canvas.width * canvas.height) / 10000), 150); 
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Enable additive blending for "glow" look
            ctx.globalCompositeOperation = 'screen';

            particles.forEach((particle, i) => {
                particle.update();
                particle.draw();

                // Connections
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[j].x - particle.x;
                    const dy = particles[j].y - particle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const connectDistance = 150;

                    if (distance < connectDistance) {
                        ctx.beginPath();
                        const opacity = (1 - distance / connectDistance) * 0.2;
                        ctx.strokeStyle = `rgba(42, 171, 238, ${opacity})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            });
            
            // Reset composite operation
            ctx.globalCompositeOperation = 'source-over';
            animationFrameId = requestAnimationFrame(animate);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        };

        const handleMouseLeave = () => {
            mouseX = -1000;
            mouseY = -1000;
        }

        window.addEventListener('resize', resizeCanvas);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        
        resizeCanvas();
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full"
            style={{ 
                background: 'radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0) 0%, rgba(9, 10, 10, 0) 100%)',
            }}
        />
    );
};
