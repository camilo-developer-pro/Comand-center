import * as THREE from 'three';
import { GraphNode } from '@/types/graph.types';

interface LabelSprite {
  sprite: THREE.Sprite;
  nodeId: string;
  centrality: number;
}

export class LabelSpriteManager {
  private labels: Map<string, LabelSprite> = new Map();
  private scene: THREE.Scene | null = null;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  // LOD Configuration
  private readonly LOD_ZOOM_THRESHOLD = 150; // Show all labels below this distance
  private readonly CENTRALITY_THRESHOLD = 0.7; // Always show high-centrality labels
  private readonly LABEL_SCALE = 20;

  constructor() {
    // Shared canvas for texture generation
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 64;
    this.context = this.canvas.getContext('2d')!;
  }

  initialize(scene: THREE.Scene, nodes: GraphNode[]): void {
    this.scene = scene;
    this.clearLabels();

    nodes.forEach(node => {
      this.createLabel(node);
    });
  }

  private createLabel(node: GraphNode): void {
    if (!this.scene) return;

    // Generate texture
    const texture = this.generateLabelTexture(node.name, node.type);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(this.LABEL_SCALE, this.LABEL_SCALE * 0.25, 1);
    sprite.position.set(
      (node.x || 0),
      (node.y || 0) + 10, // Offset above node
      (node.z || 0)
    );
    sprite.renderOrder = 999;
    sprite.name = `label_${node.id}`;

    this.scene.add(sprite);
    this.labels.set(node.id, {
      sprite,
      nodeId: node.id,
      centrality: node.centrality
    });
  }

  private generateLabelTexture(text: string, type: string): THREE.CanvasTexture {
    const ctx = this.context;
    const canvas = this.canvas;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background pill
    const bgColors: Record<string, string> = {
      entity: 'rgba(79, 70, 229, 0.9)',
      process: 'rgba(16, 185, 129, 0.9)',
      agent: 'rgba(245, 158, 11, 0.9)',
      belief: 'rgba(236, 72, 153, 0.9)'
    };

    ctx.fillStyle = bgColors[type] || 'rgba(107, 114, 128, 0.9)';
    ctx.beginPath();
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 8);
    ctx.fill();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Truncate text if needed
    const maxWidth = canvas.width - 20;
    let displayText = text;
    while (ctx.measureText(displayText).width > maxWidth && displayText.length > 3) {
      displayText = displayText.slice(0, -4) + '...';
    }

    ctx.fillText(displayText, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  updateLOD(cameraPosition: THREE.Vector3, cameraDistance: number): void {
    const isCloseRange = cameraDistance < this.LOD_ZOOM_THRESHOLD;

    this.labels.forEach((label) => {
      const material = label.sprite.material as THREE.SpriteMaterial;

      // Calculate distance from camera to this specific label
      const labelDistance = cameraPosition.distanceTo(label.sprite.position);

      // Visibility logic
      const shouldShow =
        isCloseRange ||
        label.centrality >= this.CENTRALITY_THRESHOLD ||
        labelDistance < 100;

      // Smooth opacity transition
      const targetOpacity = shouldShow ? 1 : 0;
      material.opacity += (targetOpacity - material.opacity) * 0.1;

      // Scale based on distance (prevent labels from becoming too large)
      const scaleFactor = Math.min(1, 80 / labelDistance);
      label.sprite.scale.set(
        this.LABEL_SCALE * scaleFactor,
        this.LABEL_SCALE * 0.25 * scaleFactor,
        1
      );
    });
  }

  updateLabelPosition(nodeId: string, x: number, y: number, z: number): void {
    const label = this.labels.get(nodeId);
    if (label) {
      label.sprite.position.set(x, y + 10, z);
    }
  }

  clearLabels(): void {
    this.labels.forEach((label) => {
      this.scene?.remove(label.sprite);
      (label.sprite.material as THREE.SpriteMaterial).map?.dispose();
      (label.sprite.material as THREE.SpriteMaterial).dispose();
    });
    this.labels.clear();
  }

  dispose(): void {
    this.clearLabels();
  }
}