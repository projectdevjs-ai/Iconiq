import { ContactShadows, Environment, Float, Lightformer, OrbitControls, RoundedBox, Sparkles } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RARITY } from '../config/game';
import { VARIANT_BY_ID } from '../data/catalog';
import { drawCard } from '../lib/cardCanvas';

const W = 2.5, H = 3.5, D = 0.03;

async function faceTexture(variantId: string, serial: number | null) {
  const t = new THREE.CanvasTexture(await drawCard(variantId, serial));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function backTexture() {
  const c = document.createElement('canvas');
  c.width = 750; c.height = 1050;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 36; i++) {
    g.fillStyle = i % 2 ? '#1a1430' : '#120e22';
    g.beginPath(); g.moveTo(375, 525);
    g.arc(375, 525, 1000, (i / 36) * Math.PI * 2, ((i + 1) / 36) * Math.PI * 2); g.fill();
  }
  const rg = g.createRadialGradient(375, 525, 0, 375, 525, 420);
  rg.addColorStop(0, 'rgba(139,92,255,.75)'); rg.addColorStop(1, 'rgba(139,92,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 750, 1050);
  g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 6; g.strokeRect(50, 50, 650, 950);
  g.font = '800 96px Unbounded, system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff';
  g.shadowColor = '#8b5cff'; g.shadowBlur = 40; g.fillText('ICONIQ', 375, 560);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function CardMesh({ variantId, serial, spin }: { variantId: string; serial: number | null; spin: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const [face, setFace] = useState<THREE.Texture | null>(null);
  const back = useMemo(backTexture, []);
  const r = RARITY[VARIANT_BY_ID[variantId].rarity];
  useEffect(() => {
    let t: THREE.Texture | null = null;
    faceTexture(variantId, serial).then((x) => { t = x; setFace(x); });
    return () => { t?.dispose(); };
  }, [variantId, serial]);
  useEffect(() => () => back.dispose(), [back]);

  useFrame((s, dt) => { if (spin && ref.current) ref.current.rotation.y += dt * 0.35; });

  const holo = r.rank >= 2;
  return (
    <group ref={ref}>
      <RoundedBox args={[W, H, D]} radius={0.08} smoothness={6}>
        <meshStandardMaterial color={r.color} metalness={0.9} roughness={0.25} />
      </RoundedBox>
      {face && (
        <mesh position={[0, 0, D / 2 + 0.001]}>
          <planeGeometry args={[W - 0.04, H - 0.04]} />
          <meshPhysicalMaterial
            map={face}
            roughness={holo ? 0.18 : 0.45}
            metalness={holo ? 0.35 : 0.05}
            clearcoat={1}
            clearcoatRoughness={0.08}
            iridescence={holo ? Math.min(1, 0.35 + r.rank * 0.12) : 0}
            iridescenceIOR={1.6}
            iridescenceThicknessRange={[100, 800]}
            emissive={new THREE.Color(r.glow)}
            emissiveIntensity={r.rank >= 5 ? 0.12 : 0.02}
            emissiveMap={face}
          />
        </mesh>
      )}
      <mesh position={[0, 0, -D / 2 - 0.001]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[W - 0.04, H - 0.04]} />
        <meshPhysicalMaterial map={back} roughness={0.3} metalness={0.2} clearcoat={1} iridescence={0.4} />
      </mesh>
    </group>
  );
}

export default function Card3D({ variantId, serial = null, spin = true, controls = true }: { variantId: string; serial?: number | null; spin?: boolean; controls?: boolean }) {
  const r = RARITY[VARIANT_BY_ID[variantId].rarity];
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, innerWidth < innerHeight ? 9.5 : 6.6], fov: 40 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} style={{ touchAction: 'none' }}>
      <ambientLight intensity={0.4} />
      <spotLight position={[4, 6, 6]} angle={0.4} penumbra={1} intensity={60} color={r.glow} />
      <pointLight position={[-4, -2, 4]} intensity={25} color="#22e1ff" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={4} position={[0, 4, 4]} scale={[8, 2, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={3} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} color="#8b5cff" />
        <Lightformer form="rect" intensity={3} position={[5, 0, 2]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} color="#22e1ff" />
        <Lightformer form="ring" intensity={2} position={[0, -3, 3]} scale={3} color={r.color} />
      </Environment>
      <Float speed={2} rotationIntensity={0.25} floatIntensity={0.6}>
        <CardMesh variantId={variantId} serial={serial} spin={spin} />
      </Float>
      <Sparkles count={40 + r.rank * 30} scale={[6, 6, 3]} size={2 + r.rank} speed={0.4} color={r.glow} />
      <mesh position={[0, -2.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.32, 64]} />
        <meshBasicMaterial color={r.color} transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <ContactShadows position={[0, -2.4, 0]} opacity={0.6} scale={8} blur={2.6} far={3} />
      {controls && <OrbitControls enablePan={false} minDistance={4} maxDistance={13} enableDamping dampingFactor={0.08} />}
    </Canvas>
  );
}
