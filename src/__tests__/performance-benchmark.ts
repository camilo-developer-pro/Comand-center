import { InstancedNodeRenderer } from '@/components/graph/InstancedNodeRenderer';
import * as THREE from 'three';

describe('Performance Benchmarks', () => {
  it('should handle 100k nodes within frame budget', () => {
    const scene = new THREE.Scene();
    const renderer = new InstancedNodeRenderer(100000);

    const nodes = Array.from({ length: 100000 }, (_, i) => ({
      id: `node_${i}`,
      name: `Node ${i}`,
      type: 'entity' as const,
      centrality: Math.random(),
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.random() * 1000
    }));

    const startTime = performance.now();
    renderer.initialize(scene, nodes);
    const initTime = performance.now() - startTime;

    console.log(`100k node initialization: ${initTime.toFixed(2)}ms`);
    expect(initTime).toBeLessThan(1000); // Should complete in <1 second

    // Test update performance
    const updateStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      renderer.updateNode(nodes[i].id, {
        ...nodes[i],
        x: Math.random() * 1000
      });
    }
    const updateTime = performance.now() - updateStart;

    console.log(`1000 node updates: ${updateTime.toFixed(2)}ms`);
    expect(updateTime).toBeLessThan(16); // Within single frame budget

    renderer.dispose();
  });
});