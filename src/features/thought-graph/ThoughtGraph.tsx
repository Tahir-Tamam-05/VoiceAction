// ThoughtGraph — the signature 3D knowledge universe of VoiceAction.
//
// Architecture:
//  • Deterministic spatial layout (graphLayout.ts) — same notes, same universe
//  • InstancedMesh node cores + GPU point-sprite glows → scales to 1000 notes
//  • One merged LineSegments buffer for all base edges (1 draw call)
//  • Curved highlight edges + flow particles only for the focused node
//  • Adaptive label budget — important thoughts always named, never label soup
//  • Camera rig: fly-to-node, cluster framing, idle auto-rotate, reset view
//  • Responsive inspector: side panel on desktop, bottom sheet on mobile
//  • Respects prefers-reduced-motion; quality tiers for weaker devices

import React, {
  Suspense, useMemo, useRef, useState, useCallback, useEffect,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html, Line as DreiLine } from '@react-three/drei';
import { Screen, Crystal } from '../../types';
import {
  ArrowLeft, Search, Layers, X, ExternalLink, Edit3, Pin, Zap,
  Sparkles, Trash2, RotateCcw, Crosshair,
} from 'lucide-react';
import * as THREE from 'three';
import {
  CLUSTER_PALETTE, ViewMode, GraphLayout, LayoutNode, ClusterMeta,
  computeLayout, hashFloat, getQualityTier, getLabelBudget, QualityTier,
} from './graphLayout';

// ─── Theme tokens (both themes designed intentionally) ────────

const THEME = {
  dark: {
    bg: '#050507',
    bgColor: new THREE.Color('#050507'),
    bgGlow: 'radial-gradient(ellipse 80% 55% at 50% 42%, rgba(249,115,22,0.07) 0%, transparent 66%), radial-gradient(ellipse 50% 40% at 78% 75%, rgba(139,92,246,0.05) 0%, transparent 70%)',
    headerBg: 'linear-gradient(to bottom, rgba(5,5,7,0.92) 0%, transparent 100%)',
    labelText: 'rgba(253,244,227,0.92)',
    controlBg: 'rgba(255,255,255,0.06)',
    controlBorder: 'rgba(255,255,255,0.10)',
    panelBg: 'rgba(9,7,12,0.92)',
    panelBorder: 'rgba(255,255,255,0.08)',
    statBg: 'rgba(255,255,255,0.04)',
    statBorder: 'rgba(255,255,255,0.06)',
    edgeOpacity: 0.55,
    starColor: '#ffe8d0',
    starOpacity: 0.55,
    glowStrength: 1.0,
    ambient: 0.5,
    textPrimary: '#fdf4e3',
    textSecondary: 'rgba(253,244,227,0.5)',
    textFaint: 'rgba(253,244,227,0.28)',
  },
  light: {
    bg: '#f2f0ec',
    bgColor: new THREE.Color('#f2f0ec'),
    bgGlow: 'radial-gradient(ellipse 80% 55% at 50% 42%, rgba(249,115,22,0.10) 0%, transparent 66%), radial-gradient(ellipse 50% 40% at 22% 78%, rgba(139,92,246,0.07) 0%, transparent 70%)',
    headerBg: 'linear-gradient(to bottom, rgba(242,240,236,0.95) 0%, transparent 100%)',
    labelText: 'rgba(20,15,10,0.90)',
    controlBg: 'rgba(0,0,0,0.05)',
    controlBorder: 'rgba(0,0,0,0.10)',
    panelBg: 'rgba(255,255,255,0.94)',
    panelBorder: 'rgba(0,0,0,0.08)',
    statBg: 'rgba(0,0,0,0.03)',
    statBorder: 'rgba(0,0,0,0.06)',
    edgeOpacity: 0.65,
    starColor: '#7c5cd9',
    starOpacity: 0.14,
    glowStrength: 0.4,
    ambient: 1.0,
    textPrimary: '#1a1108',
    textSecondary: 'rgba(0,0,0,0.5)',
    textFaint: 'rgba(0,0,0,0.3)',
  },
} as const;

type Theme = typeof THEME.dark | typeof THEME.light;

// ─── Environment hooks ────────────────────────────────────────

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

// ─── Quality presets ──────────────────────────────────────────

const QUALITY = {
  high:   { starsDark: 240, starsLight: 70, sphereSegs: 28, dprMax: 2,    flow: true },
  medium: { starsDark: 150, starsLight: 50, sphereSegs: 20, dprMax: 1.5,  flow: true },
  low:    { starsDark: 80,  starsLight: 30, sphereSegs: 14, dprMax: 1.25, flow: false },
} as const;

// ─── Deterministic star field (instanced, 1 draw call) ────────

const StarField: React.FC<{ isDark: boolean; quality: QualityTier; reducedMotion: boolean; spread: number }> =
  ({ isDark, quality, reducedMotion, spread }) => {
  const q = QUALITY[quality];
  const COUNT = isDark ? q.starsDark : q.starsLight;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const stars = useMemo(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      base: new THREE.Vector3(
        (hashFloat(`s${i}`, 1) - 0.5) * spread * 2,
        (hashFloat(`s${i}`, 2) - 0.5) * spread * 1.4,
        (hashFloat(`s${i}`, 3) - 0.5) * spread * 2
      ),
      scale: 0.008 + hashFloat(`s${i}`, 4) * 0.028,
      twinkle: hashFloat(`s${i}`, 5) * Math.PI * 2,
      speed: 0.6 + hashFloat(`s${i}`, 6) * 1.6,
    })), [COUNT, spread]);

  useEffect(() => {
    if (!meshRef.current) return;
    stars.forEach((s, i) => {
      dummy.position.copy(s.base);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [stars, dummy]);

  useFrame(({ clock }) => {
    if (!meshRef.current || reducedMotion) return;
    const t = clock.getElapsedTime();
    stars.forEach((s, i) => {
      const tw = 0.7 + 0.3 * Math.sin(t * s.speed + s.twinkle);
      dummy.position.copy(s.base);
      dummy.scale.setScalar(s.scale * tw);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh key={COUNT} ref={meshRef} args={[undefined, undefined, COUNT]} renderOrder={-2}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial
        color={isDark ? THEME.dark.starColor : THEME.light.starColor}
        transparent
        opacity={isDark ? THEME.dark.starOpacity : THEME.light.starOpacity}
        depthWrite={false}
        fog={false}
      />
    </instancedMesh>
  );
};

// ─── GPU point-sprite glow layer ──────────────────────────────
// One THREE.Points draw call gives every node a soft atmospheric halo.

const GLOW_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const GLOW_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    a *= a * a;
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`;

const NodeGlows: React.FC<{
  nodes: LayoutNode[];
  dimSet: Set<string>;
  activeId: string | null;
  theme: Theme;
  reducedMotion: boolean;
}> = ({ nodes, dimSet, activeId, theme, reducedMotion }) => {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const uniforms = useMemo(() => ({ uScale: { value: 300 } }), []);
  const layoutKey = useMemo(
    () => nodes.map(n => n.id).join(',') + nodes.length,
    [nodes]
  );

  const { positions, colors, baseSizes, hubIndices } = useMemo(() => {
    const positions = new Float32Array(nodes.length * 3);
    const colors = new Float32Array(nodes.length * 3);
    const baseSizes = new Float32Array(nodes.length);
    const hubIndices: number[] = [];
    const c = new THREE.Color();
    nodes.forEach((n, i) => {
      positions.set([n.position.x, n.position.y, n.position.z], i * 3);
      c.set(CLUSTER_PALETTE[n.clusterIndex % CLUSTER_PALETTE.length].hex);
      colors.set([c.r, c.g, c.b], i * 3);
      baseSizes[i] = n.size * (5.5 + n.importance * 3.5);
      if (n.tier === 'hub') hubIndices.push(i);
    });
    return { positions, colors, baseSizes, hubIndices };
  }, [nodes]);

  const alphas = useMemo(() => {
    const arr = new Float32Array(nodes.length);
    nodes.forEach((n, i) => {
      const dimmed = dimSet.has(n.id);
      const isActive = n.id === activeId;
      arr[i] = (dimmed ? 0.02 : isActive ? 0.55 : 0.16 + n.importance * 0.12) * theme.glowStrength;
    });
    return arr;
  }, [nodes, dimSet, activeId, theme]);

  // Push alpha changes into the live attribute without geometry remount
  useEffect(() => {
    const attr = geoRef.current?.getAttribute('aAlpha') as THREE.BufferAttribute | undefined;
    if (!attr) return;
    (attr.array as Float32Array).set(alphas);
    attr.needsUpdate = true;
  }, [alphas]);

  useFrame(({ clock, size, camera, viewport }) => {
    const fovRad = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    uniforms.uScale.value = (size.height * viewport.dpr) / (2 * Math.tan(fovRad / 2));
    if (reducedMotion || !geoRef.current) return;
    // Gentle breathing on hub glows only — a handful of float writes per frame
    const attr = geoRef.current.getAttribute('aSize') as THREE.BufferAttribute;
    const t = clock.getElapsedTime();
    hubIndices.forEach(i => {
      (attr.array as Float32Array)[i] = baseSizes[i] * (1 + 0.1 * Math.sin(t * 0.9 + i * 1.7));
    });
    attr.needsUpdate = true;
  });

  return (
    <points renderOrder={1} frustumCulled={false}>
      <bufferGeometry key={layoutKey} ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[baseSizes.slice(), 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[alphas.slice(), 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={GLOW_VERT}
        fragmentShader={GLOW_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// ─── Instanced node cores ─────────────────────────────────────

const NodeCores: React.FC<{
  nodes: LayoutNode[];
  selectedId: string | null;
  hoveredId: string | null;
  dimSet: Set<string>;
  theme: Theme;
  isDark: boolean;
  quality: QualityTier;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
}> = ({ nodes, selectedId, hoveredId, dimSet, theme, isDark, quality, reducedMotion, onSelect, onOpen, onHover }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const scalesRef = useRef<Float32Array>(new Float32Array(0));
  const targetsRef = useRef<Float32Array>(new Float32Array(0));

  // Base matrices + colors — recomputed only when the universe changes
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    scalesRef.current = new Float32Array(nodes.length).fill(reducedMotion ? 1 : 0.01);
    targetsRef.current = new Float32Array(nodes.length).fill(1);
    nodes.forEach((n, i) => {
      dummy.position.copy(n.position);
      dummy.scale.setScalar(n.size * scalesRef.current[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [nodes, dummy, reducedMotion]);

  // Instance colors respond to dim / active state
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const c = new THREE.Color();
    nodes.forEach((n, i) => {
      c.set(CLUSTER_PALETTE[n.clusterIndex % CLUSTER_PALETTE.length].hex);
      if (dimSet.has(n.id)) c.lerp(theme.bgColor, 0.78);
      else if (n.id === hoveredId || n.id === selectedId) c.lerp(new THREE.Color('#ffffff'), 0.22);
      mesh.setColorAt(i, c);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [nodes, dimSet, hoveredId, selectedId, theme]);

  // Scale targets: entrance, hover/selection emphasis, dim shrink
  useEffect(() => {
    nodes.forEach((n, i) => {
      targetsRef.current[i] =
        n.id === selectedId || n.id === hoveredId ? 1.45 :
        dimSet.has(n.id) ? 0.6 : 1;
    });
  }, [nodes, selectedId, hoveredId, dimSet]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const scales = scalesRef.current;
    const targets = targetsRef.current;
    let dirty = false;
    const k = 1 - Math.exp(-10 * delta); // frame-rate independent lerp
    for (let i = 0; i < nodes.length; i++) {
      const diff = targets[i] - scales[i];
      if (Math.abs(diff) < 0.004) continue;
      scales[i] += diff * k;
      dummy.position.copy(nodes[i].position);
      dummy.scale.setScalar(nodes[i].size * scales[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      dirty = true;
    }
    if (dirty) mesh.instanceMatrix.needsUpdate = true;
  });

  const idOf = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    e.instanceId !== undefined ? nodes[e.instanceId]?.id ?? null : null;

  return (
    <instancedMesh
      key={nodes.length}
      ref={meshRef}
      args={[undefined, undefined, Math.max(1, nodes.length)]}
      onClick={e => { e.stopPropagation(); const id = idOf(e); if (id) onSelect(id); }}
      onDoubleClick={e => { e.stopPropagation(); const id = idOf(e); if (id) onOpen(id); }}
      onPointerMove={e => {
        const id = idOf(e);
        if (id) { onHover(id); document.body.style.cursor = 'pointer'; }
      }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = 'default'; }}
    >
      <sphereGeometry args={[1, QUALITY[quality].sphereSegs, QUALITY[quality].sphereSegs]} />
      <meshStandardMaterial
        roughness={isDark ? 0.32 : 0.4}
        metalness={isDark ? 0.25 : 0.1}
      />
    </instancedMesh>
  );
};

// ─── Selection ring + pulse ───────────────────────────────────

const SelectionRing: React.FC<{ node: LayoutNode; reducedMotion: boolean }> = ({ node, reducedMotion }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const pulseMat = useRef<THREE.MeshBasicMaterial>(null);
  const color = CLUSTER_PALETTE[node.clusterIndex % CLUSTER_PALETTE.length].hex;

  useFrame(({ clock, camera }) => {
    // Billboard both rings toward the camera
    if (ringRef.current) ringRef.current.quaternion.copy(camera.quaternion);
    if (pulseRef.current) pulseRef.current.quaternion.copy(camera.quaternion);
    if (reducedMotion || !pulseRef.current || !pulseMat.current) return;
    const t = (clock.getElapsedTime() * 0.8) % 1;
    pulseRef.current.scale.setScalar(1 + t * 1.6);
    pulseMat.current.opacity = (1 - t) * 0.35;
  });

  return (
    <group position={node.position}>
      <mesh ref={ringRef} renderOrder={3}>
        <ringGeometry args={[node.size * 1.7, node.size * 1.95, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={pulseRef} renderOrder={3}>
        <ringGeometry args={[node.size * 1.7, node.size * 1.9, 48]} />
        <meshBasicMaterial ref={pulseMat} color={color} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ─── Base edges — one merged LineSegments buffer ──────────────

const EDGE_SEGMENTS = 8;

function edgeCurvePoints(a: THREE.Vector3, b: THREE.Vector3, samples: number): THREE.Vector3[] {
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  mid.y += a.distanceTo(b) * 0.14;
  return new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(samples);
}

const BaseEdges: React.FC<{
  layout: GraphLayout;
  theme: Theme;
  focusActive: boolean;
}> = ({ layout, theme, focusActive }) => {
  const matRef = useRef<THREE.LineBasicMaterial>(null);

  const { positions, colors, key } = useMemo(() => {
    const segCount = layout.edges.length * EDGE_SEGMENTS;
    const positions = new Float32Array(segCount * 2 * 3);
    const colors = new Float32Array(segCount * 2 * 3);
    const c = new THREE.Color();
    let o = 0;
    layout.edges.forEach(e => {
      const na = layout.nodeById.get(e.a);
      const nb = layout.nodeById.get(e.b);
      if (!na || !nb) return;
      const pts = edgeCurvePoints(na.position, nb.position, EDGE_SEGMENTS);
      // Confidence expressed as contrast against the background
      c.set(CLUSTER_PALETTE[e.clusterIndex % CLUSTER_PALETTE.length].hex)
        .lerp(theme.bgColor, 1 - (0.3 + e.confidence * 0.55));
      for (let i = 0; i < EDGE_SEGMENTS; i++) {
        positions.set([pts[i].x, pts[i].y, pts[i].z], o);
        colors.set([c.r, c.g, c.b], o);
        o += 3;
        positions.set([pts[i + 1].x, pts[i + 1].y, pts[i + 1].z], o);
        colors.set([c.r, c.g, c.b], o);
        o += 3;
      }
    });
    return { positions, colors, key: `${layout.edges.length}-${layout.nodes.length}-${theme.bg}` };
  }, [layout, theme]);

  // Fade the ambient web back when a thought is focused
  useFrame((_, delta) => {
    if (!matRef.current) return;
    const target = focusActive ? theme.edgeOpacity * 0.22 : theme.edgeOpacity;
    matRef.current.opacity = THREE.MathUtils.damp(matRef.current.opacity, target, 8, delta);
  });

  if (!layout.edges.length) return null;
  return (
    <lineSegments renderOrder={0} frustumCulled={false}>
      <bufferGeometry key={key}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial ref={matRef} vertexColors transparent opacity={theme.edgeOpacity} depthWrite={false} />
    </lineSegments>
  );
};

// ─── Highlighted edges + neural flow for the focused node ─────

const FlowParticles: React.FC<{ points: THREE.Vector3[]; color: string }> = ({ points, color }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = (clock.getElapsedTime() * 0.45) % 1;
    ([0, 0.5] as const).forEach((offset, i) => {
      const child = groupRef.current!.children[i];
      if (!child) return;
      const idx = Math.min(Math.floor(((t + offset) % 1) * points.length), points.length - 1);
      child.position.copy(points[idx]);
    });
  });
  return (
    <group ref={groupRef}>
      {[0.85, 0.5].map((opacity, i) => (
        <mesh key={i} renderOrder={4}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

const HighlightEdges: React.FC<{
  layout: GraphLayout;
  activeId: string;
  showFlow: boolean;
}> = ({ layout, activeId, showFlow }) => {
  const edges = useMemo(() =>
    layout.edges
      .filter(e => e.a === activeId || e.b === activeId)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 24),
    [layout, activeId]
  );

  return (
    <>
      {edges.map((e, i) => {
        const na = layout.nodeById.get(e.a);
        const nb = layout.nodeById.get(e.b);
        if (!na || !nb) return null;
        const pts = edgeCurvePoints(na.position, nb.position, 28);
        const color = CLUSTER_PALETTE[e.clusterIndex % CLUSTER_PALETTE.length].hex;
        return (
          <React.Fragment key={`${e.a}-${e.b}`}>
            <DreiLine
              points={pts}
              color={color}
              transparent
              opacity={0.35 + e.confidence * 0.55}
              lineWidth={1 + e.confidence * 1.2}
            />
            {showFlow && i < 5 && <FlowParticles points={pts} color={color} />}
          </React.Fragment>
        );
      })}
    </>
  );
};

// ─── Cluster atmosphere (layered depth, not flat discs) ───────

const ClusterAtmosphere: React.FC<{ cluster: ClusterMeta; isDark: boolean; reducedMotion: boolean }> =
  ({ cluster, isDark, reducedMotion }) => {
  const ref = useRef<THREE.Group>(null);
  const p = CLUSTER_PALETTE[cluster.index % CLUSTER_PALETTE.length];

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 0.4 + cluster.index * 1.3) * 0.02;
    ref.current.scale.setScalar(s);
  });

  return (
    <group ref={ref} position={cluster.centroid}>
      <mesh renderOrder={-1}>
        <sphereGeometry args={[cluster.radius * 0.95, 20, 20]} />
        <meshBasicMaterial color={p.hex} transparent opacity={isDark ? 0.030 : 0.022} depthWrite={false} side={THREE.BackSide} />
      </mesh>
      <mesh renderOrder={-1}>
        <sphereGeometry args={[cluster.radius * 0.55, 16, 16]} />
        <meshBasicMaterial color={p.hex} transparent opacity={isDark ? 0.022 : 0.015} depthWrite={false} side={THREE.BackSide} />
      </mesh>
    </group>
  );
};

// ─── Adaptive labels (DOM, capped budget) ─────────────────────

const NodeLabelTag: React.FC<{
  node: LayoutNode;
  isActive: boolean;
  isDimmed: boolean;
  isDark: boolean;
  lightweight: boolean;
}> = ({ node, isActive, isDimmed, isDark, lightweight }) => {
  const theme = isDark ? THEME.dark : THEME.light;
  const p = CLUSTER_PALETTE[node.clusterIndex % CLUSTER_PALETTE.length];
  const maxChars = isActive ? 26 : 16;
  const title = node.crystal.title;

  return (
    <Html
      position={[node.position.x, node.position.y + node.size + 0.32, node.position.z]}
      center
      distanceFactor={8}
      zIndexRange={[10, 0]}
    >
      <div style={{
        pointerEvents: 'none',
        userSelect: 'none',
        textAlign: 'center',
        opacity: isDimmed ? 0.12 : 1,
        transition: 'opacity 0.2s ease',
      }}>
        <div style={{
          display: 'inline-block',
          fontFamily: '"Manrope", sans-serif',
          fontSize: isActive ? 11.5 : 10,
          fontWeight: 800,
          lineHeight: 1.25,
          color: theme.labelText,
          whiteSpace: 'nowrap',
          maxWidth: isActive ? 150 : 100,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          ...(lightweight
            ? { textShadow: isDark ? '0 1px 6px rgba(0,0,0,0.95)' : '0 1px 4px rgba(255,255,255,0.9)' }
            : {
                background: isDark ? 'rgba(5,5,7,0.6)' : 'rgba(242,240,236,0.75)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                borderRadius: 6,
                padding: '2px 7px 3px',
                boxShadow: isActive ? `0 0 12px ${p.glow}0.25)` : '0 1px 4px rgba(0,0,0,0.15)',
              }),
        }}>
          {title.slice(0, maxChars)}{title.length > maxChars ? '…' : ''}
        </div>
      </div>
    </Html>
  );
};

const ClusterTitle: React.FC<{ cluster: ClusterMeta; isDark: boolean }> = ({ cluster, isDark }) => {
  const p = CLUSTER_PALETTE[cluster.index % CLUSTER_PALETTE.length];
  return (
    <Html
      position={[cluster.centroid.x, cluster.centroid.y + cluster.radius * 0.9 + 0.4, cluster.centroid.z]}
      center
      distanceFactor={14}
      zIndexRange={[5, 0]}
    >
      <div style={{
        pointerEvents: 'none',
        userSelect: 'none',
        fontSize: 10,
        fontWeight: 900,
        fontFamily: '"Manrope", sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color: p.hex,
        opacity: 0.75,
        whiteSpace: 'nowrap',
        textShadow: isDark ? `0 0 10px ${p.glow}0.5)` : '0 1px 3px rgba(255,255,255,0.8)',
      }}>
        {cluster.label}
      </div>
    </Html>
  );
};

// ─── Camera rig — fly-to, idle auto-rotate, reset ─────────────

interface FlyTarget { pos: THREE.Vector3; look: THREE.Vector3 }

const CameraRig: React.FC<{
  controlsRef: React.MutableRefObject<any>;
  flyRef: React.MutableRefObject<FlyTarget | null>;
  lastInteractRef: React.MutableRefObject<number>;
  reducedMotion: boolean;
  panelOpen: boolean;
}> = ({ controlsRef, flyRef, lastInteractRef, reducedMotion, panelOpen }) => {
  useFrame(({ camera }, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const fly = flyRef.current;
    if (fly) {
      const k = 1 - Math.exp(-4.2 * delta);
      camera.position.lerp(fly.pos, k);
      controls.target.lerp(fly.look, k);
      controls.update();
      if (camera.position.distanceTo(fly.pos) < 0.05 && controls.target.distanceTo(fly.look) < 0.05) {
        flyRef.current = null;
      }
    }

    // Ambient rotation: only when idle, unfocused, and motion is welcome
    const idle = performance.now() - lastInteractRef.current > 8000;
    controls.autoRotate = !reducedMotion && !fly && !panelOpen && idle;
  });
  return null;
};

// ─── Node inspector (desktop panel / mobile bottom sheet) ─────

const MOOD_EMOJI: Record<string, string> = {
  Focused: '🎯', Creative: '✨', Neutral: '💭', Energetic: '⚡',
  Reflective: '🪞', Stressed: '🌊', Calm: '🌿', Excited: '🚀',
};

const NodeInspector: React.FC<{
  crystal: Crystal;
  layout: GraphLayout;
  isDark: boolean;
  isMobile: boolean;
  onClose: () => void;
  onOpen: (c: Crystal) => void;
  onEdit: (c: Crystal) => void;
  onPin: (c: Crystal) => void;
  onDelete?: (c: Crystal) => void;
  onJumpTo: (id: string) => void;
}> = ({ crystal, layout, isDark, isMobile, onClose, onOpen, onEdit, onPin, onDelete, onJumpTo }) => {
  const theme = isDark ? THEME.dark : THEME.light;
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setConfirmDelete(false), [crystal.id]);

  const related = (layout.neighbors.get(crystal.id) ?? [])
    .map(id => layout.nodeById.get(id)?.crystal)
    .filter(Boolean)
    .slice(0, 5) as Crystal[];
  const degree = layout.neighbors.get(crystal.id)?.length ?? 0;

  const containerClass = isMobile
    ? 'absolute left-2 right-2 z-30 flex flex-col'
    : 'absolute top-24 right-4 z-30 w-80 max-w-[calc(100vw-2rem)] flex flex-col';
  const containerStyle: React.CSSProperties = isMobile
    ? {
        bottom: 'calc(58px + max(env(safe-area-inset-bottom, 0px), 6px) + 10px)',
        maxHeight: '46vh',
      }
    : {
        // Size to content, but never intrude on the bottom nav
        maxHeight: 'calc(100vh - 96px - 58px - max(env(safe-area-inset-bottom, 0px), 6px) - 16px)',
      };

  return (
    <motion.div
      initial={isMobile ? { opacity: 0, y: 40 } : { opacity: 0, x: 24 }}
      animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
      exit={isMobile ? { opacity: 0, y: 40 } : { opacity: 0, x: 24 }}
      transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
      className={containerClass}
      style={containerStyle}
    >
      <div
        className="flex-1 flex flex-col rounded-2xl overflow-hidden"
        style={{
          minHeight: 0,
          background: theme.panelBg,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${theme.panelBorder}`,
          boxShadow: isDark
            ? '0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 12px 40px rgba(0,0,0,0.14)',
        }}
      >
        {/* Mood accent */}
        <div className="h-0.5 w-full flex-shrink-0" style={{ background: crystal.moodColor ?? '#f97316' }} />

        {isMobile && (
          <div className="flex justify-center pt-2 flex-shrink-0">
            <div className="w-9 h-1 rounded-full" style={{ background: theme.controlBorder }} />
          </div>
        )}

        <div className="p-4 flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: `${crystal.moodColor ?? '#f97316'}22`, color: crystal.moodColor ?? '#f97316' }}>
                  {crystal.type}
                </span>
                {crystal.mood && (
                  <span className="text-[10px] font-medium" style={{ color: theme.textSecondary }}>
                    {MOOD_EMOJI[crystal.mood] ?? '💭'} {crystal.mood}
                  </span>
                )}
              </div>
              <h3 className="font-headline font-extrabold text-[15px] leading-snug"
                style={{ color: theme.textPrimary }}>
                {crystal.title}
              </h3>
            </div>
            <button onClick={onClose} aria-label="Close details"
              className="flex-shrink-0 w-9 h-9 -mr-1 -mt-1 rounded-lg flex items-center justify-center transition-all active:scale-90"
              style={{ color: theme.textFaint, background: theme.statBg }}>
              <X size={14} />
            </button>
          </div>

          {/* Summary */}
          {(crystal.semanticSummary || crystal.content) && (
            <p className="text-[12px] leading-relaxed line-clamp-3"
              style={{ color: theme.textSecondary }}>
              {crystal.semanticSummary || crystal.content}
            </p>
          )}

          {/* Topics + tags */}
          {(crystal.topics?.length || crystal.tags?.length) ? (
            <div className="flex flex-wrap gap-1.5">
              {crystal.topics?.slice(0, 4).map(t => (
                <span key={`t-${t}`} className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.22)' }}>
                  {t}
                </span>
              ))}
              {crystal.tags?.slice(0, 3).map(tag => (
                <span key={`g-${tag}`} className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{ background: theme.statBg, color: theme.textSecondary, border: `1px solid ${theme.statBorder}`, letterSpacing: '0.06em' }}>
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 rounded-xl p-3"
            style={{ background: theme.statBg, border: `1px solid ${theme.statBorder}` }}>
            {([
              ['Created', new Date(crystal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })],
              ['Connections', `${degree} link${degree === 1 ? '' : 's'}`],
            ] as const).map(([label, value]) => (
              <div key={label}>
                <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: theme.textFaint }}>{label}</p>
                <p className="text-[11px] font-bold" style={{ color: theme.textPrimary }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Related thoughts — jump within the universe */}
          {related.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: theme.textFaint }}>
                Neural pathways ({related.length})
              </p>
              <div className="space-y-1.5">
                {related.map(cn => (
                  <button key={cn.id} onClick={() => onJumpTo(cn.id)}
                    className="w-full text-left rounded-xl px-3 py-2 min-h-[44px] transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
                    style={{ background: theme.statBg, border: `1px solid ${theme.statBorder}` }}>
                    <Crosshair size={11} style={{ color: theme.textFaint, flexShrink: 0 }} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[11px] font-bold truncate" style={{ color: theme.textSecondary }}>
                        {cn.title}
                      </span>
                      <span className="block text-[9px] mt-0.5 uppercase tracking-wide" style={{ color: theme.textFaint }}>
                        {cn.type}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-3 flex gap-2 flex-shrink-0" style={{ borderTop: `1px solid ${theme.panelBorder}` }}>
          <button onClick={() => onOpen(crystal)}
            className="flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            style={{ background: '#f97316', color: '#000', boxShadow: '0 0 24px rgba(249,115,22,0.3)' }}>
            <ExternalLink size={12} /> Open
          </button>
          <button onClick={() => onEdit(crystal)} aria-label="Edit note"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-all active:scale-95"
            style={{ border: `1px solid ${theme.panelBorder}`, color: theme.textSecondary }}>
            <Edit3 size={14} />
          </button>
          <button onClick={() => onPin(crystal)} aria-label={crystal.pinned ? 'Unpin note' : 'Pin note'}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-all active:scale-95"
            style={{ border: `1px solid ${theme.panelBorder}`, color: crystal.pinned ? '#f97316' : theme.textSecondary }}>
            <Pin size={14} fill={crystal.pinned ? 'currentColor' : 'none'} />
          </button>
          {onDelete && (
            <button
              onClick={() => (confirmDelete ? onDelete(crystal) : setConfirmDelete(true))}
              aria-label={confirmDelete ? 'Confirm delete' : 'Delete note'}
              className="flex items-center justify-center gap-1 min-w-[44px] min-h-[44px] px-2 rounded-xl transition-all active:scale-95"
              style={confirmDelete
                ? { background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }
                : { border: `1px solid ${theme.panelBorder}`, color: theme.textSecondary }}>
              <Trash2 size={14} />
              {confirmDelete && <span className="text-[9px] font-black uppercase">Sure?</span>}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Graph coach marks (first visit) ──────────────────────────

const GRAPH_HINTS = [
  { icon: '🔵', title: 'Nodes are your thoughts', body: 'Each sphere is a note. Larger, brighter nodes have more connections — they\'re the hub ideas of your mind.' },
  { icon: '🌌', title: 'Constellations of topics', body: 'Related ideas gather into glowing regions, named and colored automatically by topic.' },
  { icon: '👆', title: 'Tap to explore', body: 'Tap any node to inspect it and see its related thoughts. Double-tap to open the full note.' },
  { icon: '✨', title: 'Pathways show strength', body: 'Brighter, thicker lines are stronger semantic connections — discovered by AI, not typed by hand.' },
] as const;

const GraphHint: React.FC<{
  step: number;
  isDark: boolean;
  onNext: () => void;
  onDismiss: () => void;
}> = ({ step, isDark, onNext, onDismiss }) => {
  const hint = GRAPH_HINTS[step];
  const isLast = step === GRAPH_HINTS.length - 1;
  const theme = isDark ? THEME.dark : THEME.light;

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="absolute left-1/2 z-40"
      style={{
        bottom: 'calc(58px + max(env(safe-area-inset-bottom, 0px), 6px) + 72px)',
        transform: 'translateX(-50%)',
        width: 'min(320px, calc(100vw - 2rem))',
      }}
    >
      <div style={{
        background: theme.panelBg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: 16,
        padding: '16px 16px 12px',
        boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{hint.icon}</span>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: theme.textPrimary, letterSpacing: '-0.01em' }}>
              {hint.title}
            </p>
          </div>
          <button onClick={onDismiss} aria-label="Dismiss hints"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textSecondary, padding: '2px 4px', lineHeight: 1 }}>
            <X size={13} />
          </button>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: theme.textSecondary, lineHeight: 1.55 }}>
          {hint.body}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {GRAPH_HINTS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 14 : 5, height: 5, borderRadius: 999,
                background: i === step ? '#f97316' : theme.textSecondary,
                transition: 'width 0.25s ease, background 0.25s ease',
                opacity: i === step ? 1 : 0.4,
              }} />
            ))}
          </div>
          <button onClick={onNext}
            style={{
              background: '#f97316', color: '#000', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 10, fontWeight: 800,
              letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
            }}>
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Loading fallback ─────────────────────────────────────────

const LoadingScreen: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="min-h-screen flex items-center justify-center"
    style={{ background: isDark ? THEME.dark.bg : THEME.light.bg }}>
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full" style={{ border: '2px solid rgba(249,115,22,0.15)' }} />
        <div className="absolute inset-0 rounded-full animate-spin"
          style={{ border: '2px solid transparent', borderTopColor: '#f97316' }} />
        <div className="absolute inset-4 rounded-full animate-pulse" style={{ background: 'rgba(249,115,22,0.12)' }} />
      </div>
      <p className="text-[11px] font-black uppercase tracking-[0.3em]"
        style={{ color: isDark ? THEME.dark.textSecondary : THEME.light.textSecondary }}>
        Building your universe
      </p>
    </div>
  </div>
);

// ─── 3D scene assembly ────────────────────────────────────────

const Scene: React.FC<{
  layout: GraphLayout;
  selectedId: string | null;
  hoveredId: string | null;
  dimSet: Set<string>;
  labelIds: Set<string>;
  isDark: boolean;
  quality: QualityTier;
  reducedMotion: boolean;
  flyRef: React.MutableRefObject<FlyTarget | null>;
  lastInteractRef: React.MutableRefObject<number>;
  controlsRef: React.MutableRefObject<any>;
  initialCam: { pos: [number, number, number]; dist: number };
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
  onBackgroundClick: (e: MouseEvent) => void;
}> = ({
  layout, selectedId, hoveredId, dimSet, labelIds, isDark, quality, reducedMotion,
  flyRef, lastInteractRef, controlsRef, initialCam, onSelect, onOpen, onHover, onBackgroundClick,
}) => {
  const theme = isDark ? THEME.dark : THEME.light;
  const activeId = hoveredId ?? selectedId;
  const selectedNode = selectedId ? layout.nodeById.get(selectedId) ?? null : null;
  const lightweightLabels = layout.nodes.length > 120;
  const showAtmosphere = layout.nodes.length > 6;

  const markInteract = useCallback(() => {
    lastInteractRef.current = performance.now();
    flyRef.current = null; // user input always interrupts camera animation
  }, [lastInteractRef, flyRef]);

  return (
    <>
      <ambientLight intensity={theme.ambient} />
      <pointLight position={[0, 4, 0]} intensity={isDark ? 220 : 120} color="#f97316" decay={1.6} />
      <directionalLight position={[8, 12, 6]} intensity={isDark ? 0.8 : 1.4} color={isDark ? '#c4b5fd' : '#ffffff'} />

      <fog attach="fog" args={[theme.bg, initialCam.dist * 1.1, initialCam.dist * 3.4]} />

      <StarField isDark={isDark} quality={quality} reducedMotion={reducedMotion}
        spread={Math.max(28, layout.boundingRadius * 3.2)} />

      {showAtmosphere && layout.clusters.filter(c => c.count >= 2).map(c => (
        <ClusterAtmosphere key={c.index} cluster={c} isDark={isDark} reducedMotion={reducedMotion} />
      ))}

      {showAtmosphere && layout.clusters.slice(0, 8).filter(c => c.count >= 2).map(c => (
        <ClusterTitle key={`t-${c.index}`} cluster={c} isDark={isDark} />
      ))}

      <BaseEdges layout={layout} theme={theme} focusActive={!!activeId} />
      {activeId && (
        <HighlightEdges layout={layout} activeId={activeId}
          showFlow={QUALITY[quality].flow && !reducedMotion} />
      )}

      {layout.nodes.length > 0 && (
        <>
          <NodeGlows nodes={layout.nodes} dimSet={dimSet} activeId={activeId} theme={theme} reducedMotion={reducedMotion} />
          <NodeCores
            nodes={layout.nodes}
            selectedId={selectedId}
            hoveredId={hoveredId}
            dimSet={dimSet}
            theme={theme}
            isDark={isDark}
            quality={quality}
            reducedMotion={reducedMotion}
            onSelect={onSelect}
            onOpen={onOpen}
            onHover={onHover}
          />
        </>
      )}

      {selectedNode && <SelectionRing node={selectedNode} reducedMotion={reducedMotion} />}

      {layout.nodes.filter(n => labelIds.has(n.id)).map(n => (
        <NodeLabelTag
          key={n.id}
          node={n}
          isActive={n.id === activeId}
          isDimmed={dimSet.has(n.id)}
          isDark={isDark}
          lightweight={lightweightLabels}
        />
      ))}

      {/* Click empty space to release focus (drag-safe — see wrapper guard) */}
      <mesh visible={false} onClick={e => onBackgroundClick(e.nativeEvent)} position={[0, 0, 0]}>
        <sphereGeometry args={[layout.boundingRadius * 6, 8, 8]} />
        <meshBasicMaterial side={THREE.BackSide} />
      </mesh>

      <CameraRig
        controlsRef={controlsRef}
        flyRef={flyRef}
        lastInteractRef={lastInteractRef}
        reducedMotion={reducedMotion}
        panelOpen={!!selectedId}
      />
      <OrbitControls
        ref={controlsRef}
        autoRotateSpeed={0.4}
        enableDamping
        dampingFactor={0.07}
        minDistance={1.6}
        maxDistance={initialCam.dist * 2.6}
        enablePan={false}
        onStart={markInteract}
      />
    </>
  );
};

// ─── Main component ───────────────────────────────────────────

type FilterType = 'all' | 'idea' | 'task' | 'voice' | 'text' | 'event';

interface ThoughtGraphProps {
  setScreen: (s: Screen) => void;
  crystals: Crystal[];
  onSelectCrystal: (crystal: Crystal) => void;
  onUpdateNote?: (crystal: Crystal) => void;
  onDeleteNote?: (id: string) => void;
  isDark?: boolean;
}

export const ThoughtGraph: React.FC<ThoughtGraphProps> = ({
  setScreen, crystals, onSelectCrystal, onUpdateNote, onDeleteNote, isDark = true,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('galaxy');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [hintStep, setHintStep] = useState<number>(() =>
    localStorage.getItem('va_graph_hints_seen') ? -1 : 0
  );

  const isMobile = useMediaQuery('(max-width: 640px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const theme = isDark ? THEME.dark : THEME.light;

  const flyRef = useRef<FlyTarget | null>(null);
  const lastInteractRef = useRef(0);
  const controlsRef = useRef<any>(null);
  const pointerDownPos = useRef<[number, number]>([0, 0]);

  // ── Data pipeline: crystals → deterministic universe ──
  const layout = useMemo(() => computeLayout(crystals, viewMode), [crystals, viewMode]);
  const quality = useMemo(() => getQualityTier(layout.nodes.length), [layout.nodes.length]);

  const initialCam = useMemo(() => {
    const dist = layout.boundingRadius * 2.05 + 2.6;
    return { pos: [0, dist * 0.42, dist * 0.91] as [number, number, number], dist };
  }, [layout.boundingRadius]);

  // ── Filter/search dimming ──
  const filterDim = useMemo(() => {
    const dimmed = new Set<string>();
    const q = searchQuery.toLowerCase();
    layout.nodes.forEach(n => {
      const matchType = activeFilter === 'all' || n.crystal.type === activeFilter;
      const matchSearch = !q ||
        n.crystal.title.toLowerCase().includes(q) ||
        n.crystal.tags?.some(t => t.toLowerCase().includes(q)) ||
        n.crystal.topics?.some(t => t.toLowerCase().includes(q));
      if (!matchType || !matchSearch) dimmed.add(n.id);
    });
    return dimmed;
  }, [layout, activeFilter, searchQuery]);

  // Focus dimming: everything except the active node + its direct pathways
  const activeId = hoveredId ?? selectedId;
  const dimSet = useMemo(() => {
    if (!activeId) return filterDim;
    const keep = new Set<string>([activeId, ...(layout.neighbors.get(activeId) ?? [])]);
    const dimmed = new Set<string>(filterDim);
    layout.nodes.forEach(n => { if (!keep.has(n.id)) dimmed.add(n.id); });
    return dimmed;
  }, [filterDim, activeId, layout]);

  // ── Adaptive label selection ──
  const labelIds = useMemo(() => {
    const budget = getLabelBudget(layout.nodes.length, isMobile);
    const ids = new Set<string>();
    if (selectedId) {
      ids.add(selectedId);
      (layout.neighbors.get(selectedId) ?? []).slice(0, 10).forEach(id => ids.add(id));
    }
    if (hoveredId) ids.add(hoveredId);
    const byImportance = [...layout.nodes]
      .filter(n => !filterDim.has(n.id))
      .sort((a, b) => b.importance - a.importance);
    for (const n of byImportance) {
      if (ids.size >= budget + (selectedId ? 6 : 0)) break;
      ids.add(n.id);
    }
    return ids;
  }, [layout, selectedId, hoveredId, filterDim, isMobile]);

  const selectedCrystal = selectedId ? crystals.find(c => c.id === selectedId) ?? null : null;

  // ── Camera actions ──
  const flyToNode = useCallback((id: string) => {
    const node = layout.nodeById.get(id);
    if (!node) return;
    const look = node.position.clone();
    const dir = look.lengthSq() > 0.01 ? look.clone().normalize() : new THREE.Vector3(0, 0.35, 1).normalize();
    const dist = Math.max(3.2, layout.boundingRadius * 0.42);
    flyRef.current = { pos: look.clone().add(dir.multiplyScalar(dist)), look };
    lastInteractRef.current = performance.now();
  }, [layout]);

  const flyToCluster = useCallback((cluster: ClusterMeta) => {
    const look = cluster.centroid.clone();
    const dir = look.lengthSq() > 0.01 ? look.clone().normalize() : new THREE.Vector3(0, 0.35, 1).normalize();
    flyRef.current = { pos: look.clone().add(dir.multiplyScalar(cluster.radius * 2.7)), look };
    lastInteractRef.current = performance.now();
  }, []);

  const resetView = useCallback(() => {
    flyRef.current = {
      pos: new THREE.Vector3(...initialCam.pos),
      look: new THREE.Vector3(0, 0, 0),
    };
    setSelectedId(null);
    lastInteractRef.current = performance.now();
  }, [initialCam]);

  // ── Interaction handlers ──
  const handleSelect = useCallback((id: string) => {
    setSelectedId(prev => {
      if (prev === id) { flyRef.current = null; return null; }
      flyToNode(id);
      return id;
    });
  }, [flyToNode]);

  const handleOpen = useCallback((id: string) => {
    const crystal = crystals.find(c => c.id === id);
    if (crystal) { onSelectCrystal(crystal); setScreen('edit'); }
  }, [crystals, onSelectCrystal, setScreen]);

  const handleOpenCrystal = useCallback((c: Crystal) => {
    onSelectCrystal(c); setScreen('edit');
  }, [onSelectCrystal, setScreen]);

  const handlePin = useCallback((c: Crystal) => {
    onUpdateNote?.({ ...c, pinned: !c.pinned, updatedAt: Date.now() });
  }, [onUpdateNote]);

  const handleDelete = useMemo(() => {
    if (!onDeleteNote) return undefined;
    return (c: Crystal) => { onDeleteNote(c.id); setSelectedId(null); };
  }, [onDeleteNote]);

  const handleJumpTo = useCallback((id: string) => {
    setSelectedId(id);
    flyToNode(id);
  }, [flyToNode]);

  // Throttle hover state churn — only update on actual change
  const handleHover = useCallback((id: string | null) => {
    setHoveredId(prev => (prev === id ? prev : id));
  }, []);

  // Esc: close panel first, then reset view
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedId) { setSelectedId(null); flyRef.current = null; }
      else resetView();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, resetView]);

  // Search result list (top matches for fly-to)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return layout.nodes
      .filter(n =>
        n.crystal.title.toLowerCase().includes(q) ||
        n.crystal.tags?.some(t => t.toLowerCase().includes(q)) ||
        n.crystal.topics?.some(t => t.toLowerCase().includes(q)))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 6);
  }, [layout, searchQuery]);

  const totalEdges = layout.edges.length;

  const FILTERS: Array<{ id: FilterType; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'idea', label: 'Ideas' },
    { id: 'task', label: 'Tasks' },
    { id: 'voice', label: 'Voice' },
    { id: 'text', label: 'Notes' },
    { id: 'event', label: 'Events' },
  ];

  return (
    <Suspense fallback={<LoadingScreen isDark={isDark} />}>
      <div className="fixed inset-0 overflow-hidden" style={{ background: theme.bg }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: theme.bgGlow }} />

        {/* 3D Canvas */}
        <Canvas
          camera={{ position: initialCam.pos, fov: 50 }}
          gl={{ antialias: quality !== 'low', alpha: true, powerPreference: 'high-performance' }}
          style={{ background: 'transparent' }}
          dpr={[1, Math.min(window.devicePixelRatio, QUALITY[quality].dprMax)]}
          onPointerDown={e => { pointerDownPos.current = [e.clientX, e.clientY]; }}
        >
          <Scene
            layout={layout}
            selectedId={selectedId}
            hoveredId={hoveredId}
            dimSet={dimSet}
            labelIds={labelIds}
            isDark={isDark}
            quality={quality}
            reducedMotion={reducedMotion}
            flyRef={flyRef}
            lastInteractRef={lastInteractRef}
            controlsRef={controlsRef}
            initialCam={initialCam}
            onSelect={handleSelect}
            onOpen={handleOpen}
            onHover={handleHover}
            onBackgroundClick={e => {
              // A drag that ends over empty space is not a deselect
              const [dx, dy] = [e.clientX - pointerDownPos.current[0], e.clientY - pointerDownPos.current[1]];
              if (dx * dx + dy * dy < 64) setSelectedId(null);
            }}
          />
        </Canvas>

        {/* ── Header controls ── */}
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pb-3 flex flex-col gap-2.5"
          style={{ background: theme.headerBg, paddingTop: 'max(env(safe-area-inset-top, 0px) + 8px, 16px)' }}>

          <div className="flex items-center gap-3">
            <button onClick={() => setScreen('home')} aria-label="Back to home"
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: theme.controlBg, border: `1px solid ${theme.controlBorder}`, color: theme.textSecondary }}>
              <ArrowLeft size={16} />
            </button>

            <div className="flex-1 text-center min-w-0">
              <h1 className="font-headline font-extrabold text-base tracking-tight" style={{ color: theme.textPrimary }}>
                Thought Graph
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: theme.textFaint }}>
                {crystals.length} thoughts · {totalEdges} connections · {layout.clusters.length} clusters
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={resetView} aria-label="Reset view"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{ background: theme.controlBg, border: `1px solid ${theme.controlBorder}`, color: theme.textSecondary }}>
                <RotateCcw size={13} />
              </button>
              <button onClick={() => setShowSearch(s => !s)} aria-label="Search graph"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: showSearch ? 'rgba(249,115,22,0.16)' : theme.controlBg,
                  border: showSearch ? '1px solid rgba(249,115,22,0.35)' : `1px solid ${theme.controlBorder}`,
                  color: showSearch ? '#f97316' : theme.textSecondary,
                }}>
                <Search size={14} />
              </button>
              <div className="flex rounded-xl overflow-hidden"
                style={{ border: `1px solid ${theme.controlBorder}`, background: theme.controlBg }}>
                {([['galaxy', 'Galaxy', Sparkles], ['sphere', 'Sphere', Layers]] as const).map(([mode, label, Icon]) => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className="flex items-center gap-1 px-2.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all"
                    style={{
                      background: viewMode === mode ? 'rgba(249,115,22,0.16)' : 'transparent',
                      color: viewMode === mode ? '#f97316' : theme.textFaint,
                      borderRight: mode === 'galaxy' ? `1px solid ${theme.controlBorder}` : 'none',
                    }}>
                    <Icon size={10} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search row + fly-to results */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="overflow-hidden"
              >
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-[13px]" style={{ color: theme.textFaint }} />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && searchResults[0]) {
                        handleJumpTo(searchResults[0].id);
                        setShowSearch(false);
                      }
                    }}
                    placeholder="Find a thought — Enter to fly to it…"
                    className="w-full pl-8 pr-9 py-2 rounded-xl text-xs font-medium outline-none transition-all"
                    style={{ background: theme.controlBg, border: `1px solid ${theme.controlBorder}`, color: theme.textPrimary }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} aria-label="Clear search"
                      className="absolute right-3 top-[11px]" style={{ color: theme.textFaint }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-1.5 rounded-xl overflow-hidden"
                    style={{ background: theme.panelBg, border: `1px solid ${theme.panelBorder}` }}>
                    {searchResults.map(n => (
                      <button key={n.id}
                        onClick={() => { handleJumpTo(n.id); setShowSearch(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                        style={{ borderBottom: `1px solid ${theme.statBorder}` }}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: CLUSTER_PALETTE[n.clusterIndex % CLUSTER_PALETTE.length].hex }} />
                        <span className="flex-1 min-w-0 text-[11px] font-bold truncate" style={{ color: theme.textPrimary }}>
                          {n.crystal.title}
                        </span>
                        <Crosshair size={11} style={{ color: theme.textFaint }} />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {FILTERS.map(({ id, label }) => (
              <button key={id} onClick={() => setActiveFilter(id)}
                className="flex-shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                style={activeFilter === id
                  ? { background: 'rgba(249,115,22,0.18)', color: '#f97316', border: '1px solid rgba(249,115,22,0.38)' }
                  : { background: theme.controlBg, color: theme.textFaint, border: `1px solid ${theme.controlBorder}` }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Cluster legend (tap to frame a constellation) ── */}
        {!(isMobile && selectedCrystal) && (
          <div
            className="absolute left-4 z-20 flex flex-wrap gap-1.5 max-w-xs"
            style={{ bottom: 'calc(58px + max(env(safe-area-inset-bottom, 0px), 6px) + 16px)' }}
          >
            {layout.clusters.slice(0, 6).filter(c => c.count >= 2).map(c => {
              const cp = CLUSTER_PALETTE[c.index % CLUSTER_PALETTE.length];
              return (
                <button key={c.index} onClick={() => flyToCluster(c)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wide transition-all active:scale-95 cursor-pointer"
                  style={{ background: `${cp.glow}0.11)`, border: `1px solid ${cp.glow}0.24)`, color: cp.hex }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cp.hex }} />
                  {c.label} · {c.count}
                </button>
              );
            })}
            <p className="w-full text-[8px] font-bold uppercase tracking-widest hidden sm:block mt-0.5"
              style={{ color: theme.textFaint }}>
              Drag · Scroll · Click · Double-click opens
            </p>
          </div>
        )}

        {/* ── Node inspector ── */}
        <AnimatePresence>
          {selectedCrystal && (
            <NodeInspector
              crystal={selectedCrystal}
              layout={layout}
              isDark={isDark}
              isMobile={isMobile}
              onClose={() => { setSelectedId(null); flyRef.current = null; }}
              onOpen={handleOpenCrystal}
              onEdit={handleOpenCrystal}
              onPin={handlePin}
              onDelete={handleDelete}
              onJumpTo={handleJumpTo}
            />
          )}
        </AnimatePresence>

        {/* ── Coach marks (first visit with notes) ── */}
        <AnimatePresence>
          {hintStep >= 0 && crystals.length > 0 && (
            <GraphHint
              step={hintStep}
              isDark={isDark}
              onNext={() => {
                const next = hintStep + 1;
                if (next >= GRAPH_HINTS.length) {
                  localStorage.setItem('va_graph_hints_seen', 'true');
                  setHintStep(-1);
                } else setHintStep(next);
              }}
              onDismiss={() => {
                localStorage.setItem('va_graph_hints_seen', 'true');
                setHintStep(-1);
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Empty state ── */}
        {crystals.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="text-center px-6">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.20)' }}>
                <Zap size={28} className="text-primary" />
              </div>
              <p className="font-headline font-extrabold text-lg tracking-tight" style={{ color: theme.textSecondary }}>
                Your thought universe is empty
              </p>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: theme.textFaint }}>
                Record a few thoughts and they'll appear here as an interactive knowledge universe.
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-3" style={{ color: theme.textFaint }}>
                Ideas connect. Constellations form. Insights emerge.
              </p>
            </div>
          </div>
        )}
      </div>
    </Suspense>
  );
};

export default ThoughtGraph;
