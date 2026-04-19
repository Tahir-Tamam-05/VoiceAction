import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function GlowingSphere() {
    const meshRef = useRef<THREE.Mesh>(null);
    const { viewport, mouse } = useThree();

    useFrame((state) => {
        if (meshRef.current) {
            // Continuous rotation
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;

            // Mouse interaction - tilt based on mouse position
            const targetRotationX = mouse.y * 0.5;
            const targetRotationZ = mouse.x * 0.5;

            meshRef.current.rotation.x += (targetRotationX - meshRef.current.rotation.x) * 0.05;
            meshRef.current.rotation.z += (targetRotationZ - meshRef.current.rotation.z) * 0.05;
        }
    });

    return (
        <Sphere ref={meshRef} args={[1.5, 64, 64]}>
            <MeshDistortMaterial
                color="#8b5cf6"
                emissive="#7c3aed"
                emissiveIntensity={0.4}
                roughness={0.1}
                metalness={0.8}
                distort={0.4}
                speed={2}
                transparent
                opacity={0.9}
            />
        </Sphere>
    );
}

function GlowEffect() {
    const glowRef = useRef<THREE.Mesh>(null);
    const { mouse } = useThree();

    useFrame((state) => {
        if (glowRef.current) {
            glowRef.current.rotation.y = state.clock.elapsedTime * 0.2;
            glowRef.current.rotation.x = state.clock.elapsedTime * 0.1;

            // Subtle mouse follow
            const targetX = mouse.x * 0.3;
            const targetY = mouse.y * 0.3;
            glowRef.current.position.x += (targetX - glowRef.current.position.x) * 0.02;
            glowRef.current.position.y += (targetY - glowRef.current.position.y) * 0.02;
        }
    });

    return (
        <Sphere ref={glowRef} args={[2.2, 32, 32]}>
            <meshBasicMaterial
                color="#a78bfa"
                transparent
                opacity={0.15}
                side={THREE.BackSide}
            />
        </Sphere>
    );
}

function Particles() {
    const particlesRef = useRef<THREE.Points>(null);
    const { mouse } = useThree();

    const particleCount = 200;

    const positions = useMemo(() => {
        const pos = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 2.5 + Math.random() * 1.5;

            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
        }
        return pos;
    }, []);

    useFrame((state) => {
        if (particlesRef.current) {
            particlesRef.current.rotation.y = state.clock.elapsedTime * 0.1;
            particlesRef.current.rotation.x = mouse.y * 0.2;
            particlesRef.current.rotation.z = mouse.x * 0.2;
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
                size={0.03}
                color="#c4b5fd"
                transparent
                opacity={0.8}
                sizeAttenuation
            />
        </points>
    );
}

export const GlowingSphere3D: React.FC = () => {
    return (
        <div className="w-full h-80 sm:h-96 relative" style={{ background: 'transparent' }}>
            <Canvas
                camera={{ position: [0, 0, 5], fov: 50 }}
            >
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#8b5cf6" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#c4b5fd" />
                <pointLight position={[0, 0, 5]} intensity={0.8} color="#7c3aed" />

                <GlowingSphere />
                <GlowEffect />
                <Particles />
            </Canvas>

            {/* Reflection/glow overlay */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-radial from-transparent via-transparent to-black/20" />
        </div>
    );
};
