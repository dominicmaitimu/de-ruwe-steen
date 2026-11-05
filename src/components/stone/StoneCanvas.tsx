import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, IcosahedronGeometry, RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three'
import type { Mesh, Texture } from 'three'

type StoneCanvasProps = {
  stage: number
  progress?: number
  compact?: boolean
  className?: string
}

function createStoneTexture(): Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 320
  const context = canvas.getContext('2d')

  if (!context) throw new Error('Stone texture canvas is unavailable')

  const image = context.createImageData(canvas.width, canvas.height)
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4
      const fineGrain = Math.sin(x * 0.41 + y * 0.17) * 5
      const broadVariation = Math.sin(x * 0.035 + y * 0.021) * 10
      const secondaryVariation = Math.sin(x * 0.09 - y * 0.065) * 6
      const value = Math.max(72, Math.min(172, 122 + fineGrain + broadVariation + secondaryVariation))

      image.data[index] = value * 0.86
      image.data[index + 1] = value * 0.89
      image.data[index + 2] = value * 0.91
      image.data[index + 3] = 255
    }
  }

  context.putImageData(image, 0, 0)
  context.globalAlpha = 0.1
  for (let index = 0; index < 45; index += 1) {
    const x = (Math.sin(index * 18.7) * 0.5 + 0.5) * canvas.width
    const y = (Math.sin(index * 7.3 + 1.4) * 0.5 + 0.5) * canvas.height
    const radius = 2 + (Math.sin(index * 3.1) * 0.5 + 0.5) * 5
    context.fillStyle = index % 3 === 0 ? '#e1d5be' : '#39434a'
    context.beginPath()
    context.ellipse(x, y, radius * 1.8, radius, index * 0.7, 0, Math.PI * 2)
    context.fill()
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(2.4, 2.4)
  texture.needsUpdate = true
  return texture
}

function RotatingStone({ stage, progress }: StoneCanvasProps) {
  const meshReference = useRef<Mesh>(null)
  const isCube = stage >= 52
  const effectiveProgress = progress ?? (stage / 52) * 100
  const texturePath =
    effectiveProgress <= 40
      ? '/textures/stone/stone-base.png'
      : effectiveProgress <= 70
        ? '/textures/stone/stone-inbetween.png'
        : '/textures/stone/stone-finished.png'
  const textureRepeat = isCube ? 1 : 2.4
  const roughnessAmount = effectiveProgress <= 40 ? 2 : effectiveProgress <= 70 ? 1 : 0.65
  const generatedTexture = useMemo(() => {
    const texture = createStoneTexture()
    texture.repeat.set(textureRepeat, textureRepeat)
    return texture
  }, [textureRepeat])
  const [uploadedTexture, setUploadedTexture] = useState<{ path: string; texture: Texture } | null>(null)

  useEffect(() => {
    const loader = new TextureLoader()
    const texture = loader.load(texturePath, (loadedTexture) => {
      loadedTexture.colorSpace = SRGBColorSpace
      loadedTexture.wrapS = RepeatWrapping
      loadedTexture.wrapT = RepeatWrapping
      loadedTexture.repeat.set(textureRepeat, textureRepeat)
      setUploadedTexture({ path: texturePath, texture: loadedTexture })
    })

    return () => texture.dispose()
  }, [texturePath, textureRepeat])

  const stoneTexture = uploadedTexture?.path === texturePath ? uploadedTexture.texture : generatedTexture
  const roughGeometry = useMemo(() => {
    const geometry = new IcosahedronGeometry(1.55, 2)
    const position = geometry.attributes.position
    const cubeInfluence = Math.min(stage / 52, 0.94)

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index)
      const y = position.getY(index)
      const z = position.getZ(index)
      const noise =
        1 +
        roughnessAmount * (0.045 * Math.sin(x * 3.2 + y * 4.7 + z * 5.1)) +
        roughnessAmount * (0.025 * Math.sin(x * 8.1 - y * 3.4 + z * 6.2))
      const verticalCompression = y > 0.8 ? 0.95 : y < -0.9 ? 0.91 : 1
      const roughX = x * noise
      const roughY = y * noise * verticalCompression
      const roughZ = z * noise
      const maximumAxis = Math.max(Math.abs(roughX), Math.abs(roughY), Math.abs(roughZ))
      const cubeScale = 1.1 / maximumAxis
      const cubeX = roughX * cubeScale
      const cubeY = roughY * cubeScale
      const cubeZ = roughZ * cubeScale

      position.setXYZ(
        index,
        roughX + (cubeX - roughX) * cubeInfluence,
        roughY + (cubeY - roughY) * cubeInfluence,
        roughZ + (cubeZ - roughZ) * cubeInfluence,
      )
    }

    geometry.computeVertexNormals()
    return geometry
  }, [roughnessAmount, stage])

  useFrame((_, delta) => {
    if (!meshReference.current) return
    meshReference.current.rotation.y += delta * 0.18
    meshReference.current.rotation.x = Math.sin(Date.now() * 0.0002) * 0.08
  })

  return (
    <mesh ref={meshReference} castShadow receiveShadow>
      {isCube ? <boxGeometry args={[2.2, 2.2, 2.2]} /> : <primitive object={roughGeometry} attach="geometry" />}
      {isCube ? (
        <meshPhysicalMaterial
          color="#a6adb0"
          map={stoneTexture}
          roughness={0.42}
          metalness={0.02}
          clearcoat={0.55}
          clearcoatRoughness={0.08}
        />
      ) : (
        <meshStandardMaterial
          color="#a6adb0"
          map={stoneTexture}
          roughness={0.99}
          metalness={0.01}
          flatShading={effectiveProgress <= 40}
        />
      )}
    </mesh>
  )
}

export function StoneCanvas({ stage, progress, compact = false, className = '' }: StoneCanvasProps) {
  return (
    <div className={`${compact ? 'h-28 sm:h-32' : 'h-[22rem] sm:h-[28rem]'} ${className} overflow-hidden rounded-2xl border border-[var(--line)] bg-[radial-gradient(circle_at_50%_35%,rgba(181,146,94,0.22),rgba(5,9,13,0.96)_62%)]`}>
      <Canvas camera={{ position: [0, 0, 5.5], fov: 42 }} shadows dpr={[1, 1.5]}>
        <ambientLight intensity={1.15} />
        <hemisphereLight intensity={1.35} color="#f1dfc5" groundColor="#25313b" />
        <directionalLight castShadow intensity={3.8} position={[3, 4, 4]} color="#f0d2a4" />
        <pointLight intensity={2} position={[-3, 1, 2]} color="#a9b9c6" />
        <RotatingStone stage={stage} progress={progress} />
        <OrbitControls enablePan={false} minDistance={3.5} maxDistance={7} />
      </Canvas>
    </div>
  )
}