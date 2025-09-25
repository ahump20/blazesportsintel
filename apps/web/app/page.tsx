import Image from 'next/image';
import Link from 'next/link';

const order = ['Baseball', 'Football', 'Basketball', 'Track & Field'];

export default function Home() {
  return (
    <main style={{ padding: '48px 24px', maxWidth: 980, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Image src="/assets/images/BI-4.png" alt="Blaze Sports Intel" width={48} height={48} />
        <div>
          <h1 style={{ margin: 0 }}>Blaze Sports Intel</h1>
          <p style={{ margin: 0, opacity: 0.75 }}>Developer graphics engine preview. Texas built. No soccer.</p>
        </div>
        <span className="badge" style={{ marginLeft: 'auto' }}>America/Chicago</span>
      </header>

      <section>
        <h2>Sports Focus</h2>
        <ol style={{ paddingLeft: '1.2rem' }}>
          {order.map((sport) => (
            <li key={sport} style={{ marginBottom: '0.5rem' }}>{sport}</li>
          ))}
        </ol>
      </section>

      <section style={{ marginTop: '2.5rem' }}>
        <h2>Developer Mode</h2>
        <p>Authenticated engineers can access the graphics lab from the links below.</p>
        <ul>
          <li><Link href="/dev">Developer Mode Console</Link></li>
          <li><Link href="/dev/labs">WebGPU Labs</Link></li>
        </ul>
      </section>
    </main>
  );
}
