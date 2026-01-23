import * as THREE from 'three';
import { GraphNode } from '@/types/graph.types';

export class InstancedNodeRenderer {
  private instancedMesh: THREE.InstancedMesh | null = null;
  private geometry: THREE.SphereGeometry;
  private material: THREE.ShaderMaterial;
  private maxInstances: number;
  private nodeIndexMap: Map<string, number> = new Map();

  // Temp objects for matrix operations (avoid GC)
  private tempMatrix = new THREE.Matrix4();
  private tempPosition = new THREE.Vector3();
  private tempQuaternion = new THREE.Quaternion();
  private tempScale = new THREE.Vector3();
  private tempColor = new THREE.Color();

  constructor(maxInstances: number = 100000) {
    this.maxInstances = maxInstances;

    // Low-poly sphere for performance
    this.geometry = new THREE.SphereGeometry(1, 8, 6);

    // Custom shader material with LOD support
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uCameraDistance: { value: 500.0 },
        uLodThreshold: { value: 150.0 },
        uTime: { value: 0.0 }
      },
      vertexShader: `
        attribute vec3 instanceColor;
        attribute float instanceCentrality;

        varying vec3 vColor;
        varying float vCentrality;
        varying float vDistanceToCamera;

        uniform float uCameraDistance;

        void main() {
          vColor = instanceColor;
          vCentrality = instanceCentrality;

          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vDistanceToCamera = -mvPosition.z;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vCentrality;
        varying float vDistanceToCamera;

        uniform float uLodThreshold;
        uniform float uTime;

        void main() {
          // LOD-based opacity: high centrality nodes stay visible longer
          float centralityBoost = vCentrality * 100.0;
          float effectiveThreshold = uLodThreshold + centralityBoost;

          float alpha = smoothstep(effectiveThreshold + 50.0, effectiveThreshold, vDistanceToCamera);
          alpha = max(alpha, 0.3); // Minimum visibility

          // Subtle pulse for high-centrality nodes
          float pulse = 1.0 + sin(uTime * 2.0) * 0.1 * vCentrality;

          vec3 finalColor = vColor * pulse;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false
    });
  }

  initialize(scene: THREE.Scene, nodes: GraphNode[]): void {
    // Clean up existing
    if (this.instancedMesh) {
      scene.remove(this.instancedMesh);
      this.instancedMesh.dispose();
    }

    // Create InstancedMesh
    this.instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.maxInstances
    );
    this.instancedMesh.frustumCulled = false;
    this.instancedMesh.name = 'nodeInstances';

    // Create custom attributes
    const colors = new Float32Array(this.maxInstances * 3);
    const centralities = new Float32Array(this.maxInstances);

    // Initialize instances
    nodes.forEach((node, index) => {
      this.nodeIndexMap.set(node.id, index);
      this.updateInstance(index, node);

      // Set color based on type
      const color = this.getNodeColor(node.type);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;

      centralities[index] = node.centrality;
    });

    // Attach custom attributes
    this.instancedMesh.geometry.setAttribute(
      'instanceColor',
      new THREE.InstancedBufferAttribute(colors, 3)
    );
    this.instancedMesh.geometry.setAttribute(
      'instanceCentrality',
      new THREE.InstancedBufferAttribute(centralities, 1)
    );

    this.instancedMesh.count = nodes.length;
    scene.add(this.instancedMesh);
  }

  updateInstance(index: number, node: GraphNode): void {
    if (!this.instancedMesh) return;

    const scale = 2 + node.centrality * 8; // Size based on centrality

    this.tempPosition.set(node.x || 0, node.y || 0, node.z || 0);
    this.tempScale.set(scale, scale, scale);
    this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);

    this.instancedMesh.setMatrixAt(index, this.tempMatrix);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  updateNode(nodeId: string, node: GraphNode): void {
    const index = this.nodeIndexMap.get(nodeId);
    if (index !== undefined) {
      this.updateInstance(index, node);
    }
  }

  updateUniforms(cameraDistance: number, time: number): void {
    if (!this.material) return;
    this.material.uniforms.uCameraDistance.value = cameraDistance;
    this.material.uniforms.uTime.value = time;
  }

  private getNodeColor(type: string): THREE.Color {
    const colorMap: Record<string, string> = {
      entity: '#4f46e5',
      process: '#10b981',
      agent: '#f59e0b',
      belief: '#ec4899'
    };
    return this.tempColor.set(colorMap[type] || '#6b7280');
  }

  dispose(): void {
    if (this.instancedMesh) {
      this.instancedMesh.geometry.dispose();
      (this.instancedMesh.material as THREE.Material).dispose();
    }
  }
}