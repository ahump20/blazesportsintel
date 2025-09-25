'use client';
import { useEffect, useState } from 'react';

type Flags = Record<string, string>;

export default function DevHome() {
  const [flags, setFlags] = useState<Flags>({});
  const [status, setStatus] = useState('');

  async function load() {
    const res = await fetch('/dev/flags', { cache: 'no-store' });
    if (!res.ok) {
      setStatus('Failed to load flags');
      return;
    }
    const data = await res.json();
    setFlags(data.flags || {});
  }

  async function save(nextFlags: Flags) {
    setStatus('Saving...');
    const res = await fetch('/dev/flags', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ updates: nextFlags })
    });
    if (!res.ok) {
      setStatus('Save failed (check Access)');
      return;
    }
    setStatus('Saved');
    load();
  }

  useEffect(() => {
    load();
  }, []);

  const update = (key: string, value: string) => {
    setFlags((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1>Developer Mode — Blaze Sports Intel</h1>
      <p>Cloudflare Access protected. Flags persist in KV storage.</p>

      <section style={{ marginTop: 24 }}>
        <h2>Feature Flags</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12 }}>
          <label htmlFor="engine-mode">engine.mode</label>
          <select id="engine-mode" value={flags['engine.mode'] || 'webgpu'} onChange={(e) => update('engine.mode', e.target.value)}>
            <option value="ue">ue</option>
            <option value="webgpu">webgpu</option>
          </select>

          <label htmlFor="codec">codec</label>
          <select id="codec" value={flags['codec'] || 'h264'} onChange={(e) => update('codec', e.target.value)}>
            <option value="h264">h264</option>
            <option value="av1">av1</option>
          </select>

          <label htmlFor="bitrate">bitrate</label>
          <input id="bitrate" value={flags['bitrate'] || '12000'} onChange={(e) => update('bitrate', e.target.value)} />

          <label htmlFor="resolution">resolution</label>
          <input id="resolution" value={flags['resolution'] || '1920x1080'} onChange={(e) => update('resolution', e.target.value)} />
        </div>
        <button style={{ marginTop: 16 }} onClick={() => save(flags)}>Save Flags</button>
        <span style={{ marginLeft: 12 }}>{status}</span>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Launchers</h2>
        <ul>
          <li><a href="/dev/ue">UE Pixel Streaming Frontend</a></li>
          <li><a href="/dev/labs">WebGPU Labs</a></li>
        </ul>
      </section>
    </main>
  );
}
