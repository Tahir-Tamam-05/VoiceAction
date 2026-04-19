import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface OrbBackgroundProps {
    isSigningIn: boolean;
}

function SubtleOrb({ isSigningIn }: { isSigningIn: boolean }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<any>(null);
    const { mouse } = useThree();
    const [brightness, setBrightness] = useState(0);

    useFrame((state) => {
        if (meshRef.current) {
            // Very slow rotation
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.08;
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.05;

            // Subtle mouse interaction - gentle tilt
            const targetX = mouse.y * 0.15;
            const targetZ = mouse.x * 0.15;
            meshRef.current.rotation.x += (targetX - meshRef.current.rotation.x) * 0.02;
            meshRef.current.rotation.z += (targetZ - meshRef.current.rotation.z) * 0.02;
        }

        // Handle sign in brightness animation
        if (materialRef.current) {
            const targetEmissive = isSigningIn ? 0.6 : 0.15;
            const currentEmissive = materialRef.current.emissiveIntensity;
            materialRef.current.emissiveIntensity += (targetEmissive - currentEmissive) * 0.05;
        }
    });

    return (
        <Sphere ref={meshRef} args={[1.8, 48, 48]}>
            <MeshDistortMaterial
                ref={materialRef}
                color="#ff7a18"
                emissive="#ff7a18"
                emissiveIntensity={0.15}
                roughness={0.4}
                metalness={0.2}
                distort={0.25}
                speed={0.8}
                transparent
                opacity={0.35}
            />
        </Sphere>
    );
}

function SoftGlow({ isSigningIn }: { isSigningIn: boolean }) {
    const glowRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (glowRef.current) {
            glowRef.current.rotation.y = state.clock.elapsedTime * 0.05;
            glowRef.current.rotation.x = state.clock.elapsedTime * 0.03;
        }
    });

    return (
        <Sphere ref={glowRef} args={[2.5, 24, 24]}>
            <meshBasicMaterial
                color="#ffb347"
                transparent
                opacity={isSigningIn ? 0.12 : 0.06}
                side={THREE.BackSide}
            />
        </Sphere>
    );
}

function AmbientParticles() {
    const particlesRef = useRef<THREE.Points>(null);

    const particleCount = 80;

    const positions = useMemo(() => {
        const pos = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 3 + Math.random() * 2;

            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
        }
        return pos;
    }, []);

    useFrame((state) => {
        if (particlesRef.current) {
            particlesRef.current.rotation.y = state.clock.elapsedTime * 0.03;
        }
    });

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particleCount}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.025}
                color="#ffb347"
                transparent
                opacity={0.4}
                sizeAttenuation
            />
        </points>
    );
}

function GradientFade() {
    return (
        <mesh position={[0, 0, -3]}>
            <planeGeometry args={[15, 15]} />
            <shaderMaterial
                transparent
                uniforms={{}}
                vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
                fragmentShader={`
          varying vec2 vUv;
          void main() {
            float dist = distance(vUv, vec2(0.5));
            float alpha = smoothstep(0.2, 0.8, dist);
            gl_FragColor = vec4(0.0, 0.0, 0.0, alpha * 0.7);
          }
        `}
            />
        </mesh>
    );
}

export const OrbBackground: React.FC<{ isSigningIn?: boolean }> = ({ isSigningIn = false }) => {
    return (
        <div className="fixed inset-0 z-0 opacity-60" style={{ background: 'transparent' }}>
            <Canvas
                camera={{ position: [0, 0, 6], fov: 45 }}
            >
                <ambientLight intensity={0.2} />
                <pointLight position={[5, 5, 5]} intensity={0.4} color="#ff7a18" />
                <pointLight position={[-5, -5, 3]} intensity={0.2} color="#ffb347" />

                <SubtleOrb isSigningIn={isSigningIn} />
                <SoftGlow isSigningIn={isSigningIn} />
                <AmbientParticles />
            </Canvas>

            {/* CSS gradient overlay for edge fade */}
            <div
                className="absolute inset-0 transition-opacity duration-500"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.4) 100%)'
                }}
            />
        </div>
    );
};