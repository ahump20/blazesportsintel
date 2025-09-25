'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

function hasWebGPU() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export default function Labs() {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(hasWebGPU());
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>WebGPU Labs</h1>
      <p>Status: {supported ? 'WebGPU supported' : 'WebGPU not available → falling back to WebGL'}</p>
      <ul>
        <li><Link href="/dev/labs/baseball">Baseball — Strike Zone 3D</Link></li>
        <li><Link href="/dev/labs/football">Football — Route Trees (stub)</Link></li>
        <li><Link href="/dev/labs/basketball">Basketball — Shot Volume (stub)</Link></li>
        <li><Link href="/dev/labs/track">Track & Field — Stride Traces (stub)</Link></li>
      </ul>
    </main>
  );
}
