'use client';

import { useState, useEffect, useRef } from 'react';

// Mock real-time data that would come from APIs in production
const LIVE_DATA = {
  mlb: {
    scores: [
      {
        home: { name: 'St. Louis Cardinals', logo: '🔴', score: 7, city: 'STL' },
        away: { name: 'Houston Astros', logo: '🟠', score: 5, city: 'HOU' },
        inning: '8th',
        isLive: true,
        stadium: 'Busch Stadium'
      },
      {
        home: { name: 'Texas Rangers', logo: '🔵', score: 4 },
        away: { name: 'Oakland Athletics', logo: '🟢', score: 8 },
        inning: 'Final',
        isLive: false,
        stadium: 'Globe Life Field'
      }
    ],
    standings: [
      { rank: 1, team: 'Houston Astros', wins: 89, losses: 73, pct: 0.549, gb: '-', streak: 'W3' },
      { rank: 2, team: 'Texas Rangers', wins: 85, losses: 77, pct: 0.525, gb: '4.0', streak: 'L1' },
      { rank: 3, team: 'Seattle Mariners', wins: 82, losses: 80, pct: 0.506, gb: '7.0', streak: 'W2' },
      { rank: 4, team: 'Los Angeles Angels', wins: 76, losses: 86, pct: 0.469, gb: '13.0', streak: 'L2' },
      { rank: 5, team: 'Oakland Athletics', wins: 69, losses: 93, pct: 0.426, gb: '20.0', streak: 'W1' }
    ],
    topPlayers: [
      { name: 'Yordan Alvarez', position: 'DH', team: 'HOU', stat: '31', statType: 'HR', avg: '.293' },
      { name: 'Jose Altuve', position: '2B', team: 'HOU', stat: '.311', statType: 'AVG', hr: '15' },
      { name: 'Corey Seager', position: 'SS', team: 'TEX', stat: '33', statType: 'HR', avg: '.327' },
      { name: 'Nolan Goldschmidt', position: '1B', team: 'STL', stat: '.317', statType: 'AVG', hr: '22' },
      { name: 'Kyle Tucker', position: 'RF', team: 'HOU', stat: '23', statType: 'HR', avg: '.289' }
    ]
  },
  nfl: {
    scores: [
      {
        home: { name: 'Tennessee Titans', logo: '⚔️', score: 17 },
        away: { name: 'Houston Texans', logo: '🐂', score: 24 },
        quarter: 'Final',
        isLive: false,
        stadium: 'Nissan Stadium'
      },
      {
        home: { name: 'Dallas Cowboys', logo: '⭐', score: 28 },
        away: { name: 'Green Bay Packers', logo: '🧀', score: 21 },
        quarter: '4Q - 2:47',
        isLive: true,
        stadium: 'AT&T Stadium'
      }
    ],
    standings: [
      { rank: 1, team: 'Houston Texans', wins: 11, losses: 6, pct: 0.647, conf: 'AFC South', streak: 'W2' },
      { rank: 2, team: 'Dallas Cowboys', wins: 10, losses: 7, pct: 0.588, conf: 'NFC East', streak: 'W1' },
      { rank: 3, team: 'Tennessee Titans', wins: 6, losses: 11, pct: 0.353, conf: 'AFC South', streak: 'L3' },
      { rank: 4, team: 'Green Bay Packers', wins: 9, losses: 8, pct: 0.529, conf: 'NFC North', streak: 'L1' }
    ],
    topPlayers: [
      { name: 'Dak Prescott', position: 'QB', team: 'DAL', stat: '3,895', statType: 'YDS', tds: '24' },
      { name: 'CJ Stroud', position: 'QB', team: 'HOU', stat: '4,108', statType: 'YDS', tds: '28' },
      { name: 'Derrick Henry', position: 'RB', team: 'TEN', stat: '1,234', statType: 'YDS', tds: '12' },
      { name: 'Micah Parsons', position: 'LB', team: 'DAL', stat: '14.0', statType: 'SACKS', tackles: '89' }
    ]
  },
  nba: {
    scores: [
      {
        home: { name: 'Memphis Grizzlies', logo: '🐻', score: 118 },
        away: { name: 'San Antonio Spurs', logo: '🏀', score: 112 },
        quarter: 'Final',
        isLive: false,
        arena: 'FedEx Forum'
      },
      {
        home: { name: 'Dallas Mavericks', logo: '🐴', score: 105 },
        away: { name: 'Houston Rockets', logo: '🚀', score: 98 },
        quarter: '3Q - 5:23',
        isLive: true,
        arena: 'American Airlines Center'
      }
    ],
    standings: [
      { rank: 1, team: 'Denver Nuggets', wins: 42, losses: 28, pct: 0.600, conf: 'Western', streak: 'W3' },
      { rank: 2, team: 'Memphis Grizzlies', wins: 38, losses: 32, pct: 0.543, conf: 'Western', streak: 'W1' },
      { rank: 3, team: 'Dallas Mavericks', wins: 35, losses: 35, pct: 0.500, conf: 'Western', streak: 'W2' },
      { rank: 4, team: 'Houston Rockets', wins: 33, losses: 37, pct: 0.471, conf: 'Western', streak: 'L1' },
      { rank: 5, team: 'San Antonio Spurs', wins: 18, losses: 52, pct: 0.257, conf: 'Western', streak: 'L2' }
    ],
    topPlayers: [
      { name: 'Luka Dončić', position: 'PG', team: 'DAL', stat: '33.2', statType: 'PPG', ast: '8.9' },
      { name: 'Victor Wembanyama', position: 'C', team: 'SAS', stat: '21.8', statType: 'PPG', blk: '3.5' },
      { name: 'Ja Morant', position: 'PG', team: 'MEM', stat: '27.1', statType: 'PPG', ast: '8.2' },
      { name: 'Alperen Şengün', position: 'C', team: 'HOU', stat: '13.1', statType: 'PPG', ast: '7.2' }
    ]
  },
  ncaa: {
    scores: [
      {
        home: { name: 'Texas Longhorns', logo: '🤘', score: 35 },
        away: { name: 'Oklahoma Sooners', logo: '⭐', score: 28 },
        quarter: 'Final',
        isLive: false,
        stadium: 'Royal-Memorial Stadium'
      },
      {
        home: { name: 'Alabama Crimson Tide', logo: '🐘', score: 24 },
        away: { name: 'Georgia Bulldogs', logo: '🐕', score: 17 },
        quarter: '3Q - 8:23',
        isLive: true,
        stadium: 'Bryant-Denny Stadium'
      }
    ],
    standings: [
      { rank: 1, team: 'Texas Longhorns', wins: 12, losses: 2, conf: 'SEC', ranking: '#3' },
      { rank: 2, team: 'Alabama Crimson Tide', wins: 11, losses: 3, conf: 'SEC', ranking: '#8' },
      { rank: 3, team: 'Georgia Bulldogs', wins: 10, losses: 4, conf: 'SEC', ranking: '#12' },
      { rank: 4, team: 'Oklahoma Sooners', wins: 8, losses: 6, conf: 'SEC', ranking: 'NR' }
    ]
  }
};

const STATS_DATA = {
  championships: { cardinals: '11 World Series', titans: '1999 AFC Championship', grizzlies: '0 NBA Championships', longhorns: '4 National Championships' },
  performance: { cardinals: 94.6, titans: 67.3, grizzlies: 82.1, longhorns: 91.8 },
  trending: { up: ['longhorns', 'cardinals'], down: ['titans'], stable: ['grizzlies'] }
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const [currentSport, setCurrentSport] = useState('mlb');
  const [isLoading, setIsLoading] = useState(true);
  const [liveStats, setLiveStats] = useState(STATS_DATA);
  const [activeDashboard, setActiveDashboard] = useState('dashboard');
  const [poseDetection, setPoseDetection] = useState(false);
  const [visionMode, setVisionMode] = useState('standard');
  const [selectedTeam, setSelectedTeam] = useState('cardinals');

  // Initialize particle system
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < 200; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          size: Math.random() * 4 + 1,
          opacity: Math.random() * 0.8 + 0.2,
          hue: Math.random() * 60 + 10,
        });
      }
    };

    initParticles();

    // Animation loop
    const animate = (time: number) => {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Pulse effect
        const pulse = Math.sin(time * 0.003 + particle.x * 0.01) * 0.3 + 0.7;

        ctx.save();
        ctx.globalAlpha = particle.opacity * pulse;

        // Create gradient
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 4
        );
        gradient.addColorStop(0, `hsl(${particle.hue}, 100%, 60%)`);
        gradient.addColorStop(1, `hsl(${particle.hue}, 100%, 20%)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw connections
      ctx.strokeStyle = 'rgba(255, 107, 53, 0.1)';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p1 = particlesRef.current[i];
          const p2 = particlesRef.current[j];
          const distance = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

          if (distance < 120) {
            ctx.globalAlpha = 1 - distance / 120;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Simulate loading completion
    setTimeout(() => setIsLoading(false), 2000);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const sportLabels = {
    mlb: 'Baseball',
    nfl: 'Football',
    nba: 'Basketball',
    ncaa: 'Track & Field'
  };

  const getCurrentData = () => LIVE_DATA[currentSport as keyof typeof LIVE_DATA];

  const generateHeatMapData = () => {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      intensity: Math.random(),
      zone: `Zone ${i + 1}`,
      activity: Math.floor(Math.random() * 100),
      success: Math.floor(Math.random() * 30 + 60)
    }));
  };

  const heatMapData = generateHeatMapData();

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #141414 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          border: '4px solid transparent',
          borderTop: '4px solid #FF4500',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <h2 style={{ marginTop: '2rem', color: '#FF4500', fontFamily: 'Inter' }}>
          Initializing Blaze Sports Intel...
        </h2>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAFA', fontFamily: 'Inter', position: 'relative' }}>
      {/* Particle Canvas Background */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      {/* Navigation Header */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(20px)',
        zIndex: 1000,
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(255, 69, 0, 0.3)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1.5rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #FF4500, #FFA500)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            cursor: 'pointer'
          }}>
            🔥 BLAZE SPORTS INTEL
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {['dashboard', 'scores', 'standings', 'analytics', 'vision'].map((section) => (
              <a
                key={section}
                href={`#${section}`}
                onClick={() => setActiveDashboard(section)}
                style={{
                  color: activeDashboard === section ? '#FF4500' : '#FAFAFA',
                  textDecoration: 'none',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  borderBottom: activeDashboard === section ? '2px solid #FF4500' : 'none',
                  paddingBottom: '4px',
                  transition: 'all 0.3s ease'
                }}
              >
                {section}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <div style={{ paddingTop: '80px', position: 'relative', zIndex: 10 }}>

        {/* Hero Section */}
        <section style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 2rem'
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, rgba(57, 255, 20, 0.15), rgba(0, 212, 255, 0.15))',
              border: '1px solid rgba(57, 255, 20, 0.4)',
              borderRadius: '50px',
              marginBottom: '40px',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: '#39FF14',
                borderRadius: '50%',
                boxShadow: '0 0 15px #39FF14'
              }} />
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#39FF14',
                fontFamily: 'JetBrains Mono, monospace'
              }}>CHAMPIONSHIP INTELLIGENCE</span>
            </div>
          </div>

          <h1 style={{
            fontSize: 'clamp(60px, 8vw, 140px)',
            fontWeight: 900,
            lineHeight: 0.85,
            marginBottom: '40px',
            background: 'linear-gradient(135deg, #ffffff 0%, #FFD700 30%, #FF6B35 60%, #C41E3A 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            DEEP SOUTH
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #FF6B35, #C41E3A, #FFD700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>SPORTS AUTHORITY</span>
          </h1>

          <p style={{
            fontSize: '24px',
            lineHeight: 1.6,
            color: 'rgba(255, 255, 255, 0.85)',
            marginBottom: '50px',
            maxWidth: '700px'
          }}>
            Real-time analytics powered by next-generation AI. From Friday Night Lights
            to Sunday in the Show - comprehensive intelligence for every level of competition.
          </p>

          {/* Performance Stats */}
          <div style={{
            display: 'flex',
            gap: '40px',
            marginBottom: '60px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.8), rgba(10, 10, 10, 0.8))',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '16px',
              backdropFilter: 'blur(20px)',
              minWidth: '120px'
            }}>
              <div style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#FFD700',
                marginBottom: '8px',
                fontFamily: 'JetBrains Mono, monospace'
              }}>2.8M+</div>
              <div style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: 600
              }}>Data Points</div>
            </div>
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.8), rgba(10, 10, 10, 0.8))',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '16px',
              backdropFilter: 'blur(20px)',
              minWidth: '120px'
            }}>
              <div style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#FFD700',
                marginBottom: '8px',
                fontFamily: 'JetBrains Mono, monospace'
              }}>94.6%</div>
              <div style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: 600
              }}>Accuracy</div>
            </div>
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.8), rgba(10, 10, 10, 0.8))',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '16px',
              backdropFilter: 'blur(20px)',
              minWidth: '120px'
            }}>
              <div style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#FFD700',
                marginBottom: '8px',
                fontFamily: 'JetBrains Mono, monospace'
              }}>&lt;100ms</div>
              <div style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: 600
              }}>Latency</div>
            </div>
          </div>

          {/* Sport Selector */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.entries(sportLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCurrentSport(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '18px 36px',
                  fontSize: '16px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  border: 'none',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  background: currentSport === key
                    ? 'linear-gradient(135deg, #C41E3A, #FF6B35)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: currentSport === key ? '0 20px 40px rgba(196, 30, 58, 0.4)' : 'none'
                }}
              >
                <span style={{ fontSize: '20px' }}>
                  {key === 'mlb' ? '⚾' : key === 'nfl' ? '🏈' : key === 'nba' ? '🏀' : '🏃'}
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Live Scores Section */}
        <section style={{
          padding: '4rem 2rem',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>Live Scores</h2>
          <div style={{
            display: 'flex',
            gap: '2rem',
            overflowX: 'auto',
            padding: '1rem 0'
          }}>
            {getCurrentData()?.scores?.map((game: any, index: number) => (
              <div key={index} style={{
                minWidth: '320px',
                background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(42, 42, 42, 0.95))',
                borderRadius: '15px',
                padding: '1.5rem',
                border: '1px solid rgba(255, 69, 0, 0.3)',
                position: 'relative'
              }}>
                {game.isLive && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#DC143C',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: '#DC143C',
                      borderRadius: '50%'
                    }} />
                    LIVE
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1rem'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{game.away.logo}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      {game.away.name}
                    </div>
                    <div style={{
                      fontSize: '2.5rem',
                      fontWeight: 900,
                      color: '#FF4500'
                    }}>
                      {game.away.score}
                    </div>
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>VS</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{game.home.logo}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      {game.home.name}
                    </div>
                    <div style={{
                      fontSize: '2.5rem',
                      fontWeight: 900,
                      color: '#FF4500'
                    }}>
                      {game.home.score}
                    </div>
                  </div>
                </div>
                <div style={{
                  textAlign: 'center',
                  marginTop: '1rem',
                  color: '#FFA500',
                  fontWeight: 600
                }}>
                  {currentSport === 'mlb' ? `Inning: ${game.inning}` :
                   currentSport === 'nfl' || currentSport === 'nba' ? game.quarter :
                   game.inning}
                </div>
                {game.stadium && (
                  <div style={{
                    textAlign: 'center',
                    marginTop: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.85rem'
                  }}>
                    {game.stadium}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Dashboard Analytics Grid */}
        <section style={{
          padding: '4rem 2rem',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            Intelligence Dashboard
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '2rem'
          }}>
            {/* Team Performance Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9), rgba(42, 42, 42, 0.9))',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '1.5rem',
              border: '1px solid rgba(255, 69, 0, 0.2)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFA500' }}>
                  Team Performance
                </h3>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #FF4500, #FF6B35)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>📊</div>
              </div>
              <div style={{ height: '300px', position: 'relative' }}>
                {/* Simulated Chart */}
                <div style={{
                  display: 'flex',
                  alignItems: 'end',
                  height: '100%',
                  gap: '20px',
                  padding: '20px 0'
                }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <div style={{
                        width: '100%',
                        height: `${60 + Math.random() * 120}px`,
                        background: 'linear-gradient(0deg, #FF4500, #FFA500)',
                        borderRadius: '4px 4px 0 0',
                        position: 'relative',
                        animation: `grow 2s ease-out ${i * 0.2}s both`
                      }} />
                      <div style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        textAlign: 'center'
                      }}>
                        Game {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Players Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9), rgba(42, 42, 42, 0.9))',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '1.5rem',
              border: '1px solid rgba(255, 69, 0, 0.2)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFA500' }}>
                  Top Players
                </h3>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #FF4500, #FF6B35)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>🏆</div>
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {getCurrentData()?.topPlayers?.map((player: any, index: number) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'rgba(255, 69, 0, 0.05)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 69, 0, 0.2)',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      background: 'linear-gradient(135deg, #FF4500, #FF6B35)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.25rem'
                    }}>
                      {player.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                        {player.name}
                      </div>
                      <div style={{
                        fontSize: '0.85rem',
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}>
                        {player.position} • {player.team}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        color: '#FFA500'
                      }}>
                        {player.stat}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.6)'
                      }}>
                        {player.statType}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Heat Map Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9), rgba(42, 42, 42, 0.9))',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '1.5rem',
              border: '1px solid rgba(255, 69, 0, 0.2)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFA500' }}>
                  Field Heat Map
                </h3>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #FF4500, #FF6B35)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>🔥</div>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 1fr)',
                gap: '2px',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '10px'
              }}>
                {heatMapData.map((cell) => {
                  const hue = 30 - (cell.intensity * 30);
                  const opacity = 0.3 + (cell.intensity * 0.7);
                  return (
                    <div
                      key={cell.id}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '4px',
                        background: `hsla(${hue}, 100%, 50%, ${opacity})`,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      title={`${cell.zone}: ${cell.activity}% activity`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.2)';
                        e.currentTarget.style.zIndex = '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.zIndex = 'auto';
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Vision AI Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9), rgba(42, 42, 42, 0.9))',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '1.5rem',
              border: '1px solid rgba(255, 69, 0, 0.2)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFA500' }}>
                  Vision AI Analysis
                </h3>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #FF4500, #FF6B35)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>👁️</div>
              </div>
              <div style={{
                height: '200px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                border: '2px dashed rgba(255, 69, 0, 0.3)'
              }}>
                <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📹</div>
                  <div>Click to activate pose detection</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['Pose Detection', 'Form Analysis', 'Character Read'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setVisionMode(mode.toLowerCase().replace(' ', '_'))}
                    style={{
                      padding: '8px 16px',
                      background: visionMode === mode.toLowerCase().replace(' ', '_')
                        ? 'linear-gradient(135deg, #FF4500, #FF6B35)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 69, 0, 0.3)',
                      borderRadius: '20px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Standings Table */}
        <section style={{
          padding: '4rem 2rem',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            League Standings
          </h2>
          <div style={{
            background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9), rgba(42, 42, 42, 0.9))',
            borderRadius: '20px',
            padding: '1.5rem',
            overflowX: 'auto'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{
                    background: 'linear-gradient(135deg, #FF4500, #FF6B35)',
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                    letterSpacing: '1px'
                  }}>Rank</th>
                  <th style={{
                    background: 'linear-gradient(135deg, #FF4500, #FF6B35)',
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                    letterSpacing: '1px'
                  }}>Team</th>
                  <th style={{
                    background: 'linear-gradient(135deg, #FF4500, #FF6B35)',
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                    letterSpacing: '1px'
                  }}>W</th>
                  <th style={{
                    background: 'linear-gradient(135deg, #FF4500, #FF6B35)',
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                    letterSpacing: '1px'
                  }}>L</th>
                  <th style={{
                    background: 'linear-gradient(135deg, #FF4500, #FF6B35)',
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                    letterSpacing: '1px'
                  }}>PCT</th>
                  <th style={{
                    background: 'linear-gradient(135deg, #FF4500, #FF6B35)',
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                    letterSpacing: '1px'
                  }}>GB</th>
                  <th style={{
                    background: 'linear-gradient(135deg, #FF4500, #FF6B35)',
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                    letterSpacing: '1px'
                  }}>Streak</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentData()?.standings?.map((team: any, index: number) => {
                  const streakColor = team.streak?.startsWith('W') ? '#00FF41' : '#DC143C';
                  return (
                    <tr key={index} style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.3s ease'
                    }}>
                      <td style={{
                        padding: '1rem',
                        fontWeight: 900,
                        color: '#FFA500',
                        fontSize: '1.25rem'
                      }}>
                        {team.rank}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span>{team.team}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>{team.wins}</td>
                      <td style={{ padding: '1rem' }}>{team.losses}</td>
                      <td style={{
                        padding: '1rem',
                        color: '#FFA500',
                        fontWeight: 700
                      }}>
                        {team.pct ? team.pct.toFixed(3) : 'N/A'}
                      </td>
                      <td style={{ padding: '1rem' }}>{team.gb}</td>
                      <td style={{
                        padding: '1rem',
                        color: streakColor,
                        fontWeight: 700
                      }}>
                        {team.streak}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3D Stadium Visualization */}
        <section style={{
          padding: '4rem 2rem',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            3D Stadium Experience
          </h2>
          <div style={{
            height: '500px',
            background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(42, 42, 42, 0.95))',
            borderRadius: '20px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 69, 0, 0.3)'
          }}>
            <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏟️</div>
              <div style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Interactive 3D Stadium View</div>
              <div>WebGL-powered immersive experience</div>
            </div>
            <div style={{
              position: 'absolute',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '1rem',
              background: 'rgba(10, 10, 10, 0.9)',
              padding: '1rem',
              borderRadius: '50px',
              backdropFilter: 'blur(10px)'
            }}>
              {['↶', '+', '-', '↷', '⟲'].map((icon, index) => (
                <button key={index} style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '2px solid #FF4500',
                  background: 'transparent',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Mobile App Preview */}
        <section style={{
          padding: '4rem 2rem',
          maxWidth: '1400px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>
            Mobile Experience
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '3rem'
          }}>
            Championship-tier analytics in your pocket
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginTop: '2rem'
          }}>
            <div style={{
              padding: '2rem',
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9), rgba(42, 42, 42, 0.9))',
              borderRadius: '20px',
              border: '1px solid rgba(255, 69, 0, 0.2)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#FFA500' }}>
                Native Mobile App
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Real-time pose detection and performance analysis on iOS and Android
              </p>
            </div>
            <div style={{
              padding: '2rem',
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9), rgba(42, 42, 42, 0.9))',
              borderRadius: '20px',
              border: '1px solid rgba(255, 69, 0, 0.2)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#FFA500' }}>
                AR Training Mode
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Augmented reality overlays for biomechanical analysis and form correction
              </p>
            </div>
            <div style={{
              padding: '2rem',
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9), rgba(42, 42, 42, 0.9))',
              borderRadius: '20px',
              border: '1px solid rgba(255, 69, 0, 0.2)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#FFA500' }}>
                Edge Computing
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Sub-100ms latency with on-device AI processing and cloud synchronization
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          padding: '4rem 2rem 2rem',
          borderTop: '1px solid rgba(255, 69, 0, 0.2)',
          textAlign: 'center',
          background: 'linear-gradient(180deg, transparent 0%, rgba(10, 10, 10, 0.8) 100%)'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <span style={{ fontSize: '2rem' }}>🔥</span>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #FF4500, #FFA500)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Blaze Sports Intel
                </span>
              </div>
              <div style={{
                display: 'flex',
                gap: '3rem',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                <span>2.8M+ Data Points</span>
                <span>94.6% Accuracy</span>
                <span>&lt;100ms Latency</span>
              </div>
            </div>
            <div style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.9rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: '1rem'
            }}>
              © 2025 Blaze Sports Intel. Deep South Sports Authority. Where champions are forged.
            </div>
          </div>
        </footer>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes grow {
          from { height: 0px; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .float-animation {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .hero-stats {
            justify-content: center !important;
            gap: 20px !important;
          }

          .sport-selector {
            justify-content: center !important;
          }

          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}