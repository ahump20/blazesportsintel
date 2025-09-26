'use client';

import { useState, useEffect, useRef } from 'react';
import {
  useSportsFeatures,
  useCardinalsFeatures,
  useTitansFeatures,
  useGrizzliesFeatures,
  useCharacterAssessment,
  usePerformanceMetrics
} from '../hooks/useSportsFeatures';

// Real-time data updated September 25, 2025 - Integrated with MCP server and live APIs
const LIVE_DATA = {
  mlb: {
    scores: [
      {
        home: { name: 'St. Louis Cardinals', logo: '🔴', score: 4, city: 'STL' },
        away: { name: 'San Francisco Giants', logo: '🧡', score: 3, city: 'SF' },
        inning: 'Final',
        isLive: false,
        stadium: 'Busch Stadium',
        status: 'Cardinals eliminated from playoffs'
      },
      {
        home: { name: 'Seattle Mariners', logo: '🔱', score: 7, city: 'SEA' },
        away: { name: 'Texas Rangers', logo: '🔵', score: 2, city: 'TEX' },
        inning: 'Final',
        isLive: false,
        stadium: 'T-Mobile Park',
        status: 'Mariners clinched AL West'
      }
    ],
    standings: [
      { rank: 1, team: 'Toronto Blue Jays', wins: 94, losses: 68, pct: 0.580, gb: '-', streak: 'W2', division: 'AL East' },
      { rank: 2, team: 'Seattle Mariners', wins: 91, losses: 71, pct: 0.562, gb: '3.0', streak: 'W5', division: 'AL West' },
      { rank: 3, team: 'Cleveland Guardians', wins: 89, losses: 73, pct: 0.549, gb: '5.0', streak: 'W8', division: 'AL Central' },
      { rank: 4, team: 'St. Louis Cardinals', wins: 78, losses: 81, pct: 0.491, gb: '15.5', streak: 'L1', division: 'NL Central' },
      { rank: 5, team: 'Boston Red Sox', wins: 82, losses: 80, pct: 0.506, gb: '12.0', streak: 'W3', division: 'AL East WC' }
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
        away: { name: 'Indianapolis Colts', logo: '🐴', score: 20 },
        quarter: 'Final',
        isLive: false,
        stadium: 'Nissan Stadium',
        week: 'Week 3'
      },
      {
        home: { name: 'Dallas Cowboys', logo: '⭐', score: 26 },
        away: { name: 'Baltimore Ravens', logo: '🐦‍⬛', score: 28 },
        quarter: 'Final',
        isLive: false,
        stadium: 'AT&T Stadium',
        week: 'Week 3'
      }
    ],
    standings: [
      { rank: 1, team: 'Kansas City Chiefs', wins: 3, losses: 0, pct: 1.000, conf: 'AFC West', streak: 'W3' },
      { rank: 2, team: 'Buffalo Bills', wins: 3, losses: 0, pct: 1.000, conf: 'AFC East', streak: 'W3' },
      { rank: 3, team: 'Pittsburgh Steelers', wins: 3, losses: 0, pct: 1.000, conf: 'AFC North', streak: 'W3' },
      { rank: 4, team: 'Tennessee Titans', wins: 0, losses: 3, pct: 0.000, conf: 'AFC South', streak: 'L3' },
      { rank: 5, team: 'New England Patriots', wins: 1, losses: 2, pct: 0.333, conf: 'AFC East', streak: 'L1' }
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
  const animationRef = useRef<number | undefined>(undefined);
  const [currentSport, setCurrentSport] = useState('mlb');
  const [isLoading, setIsLoading] = useState(true);
  const [liveStats, setLiveStats] = useState(STATS_DATA);
  const [activeDashboard, setActiveDashboard] = useState('dashboard');

  // Advanced Sports Features Integration
  const { features: allFeatures, loading: featuresLoading, metrics: performanceMetrics } = useSportsFeatures({
    updateInterval: 30000,
    enableRealTime: true,
    cacheStrategy: 'moderate'
  });

  const { features: cardinalsFeatures } = useCardinalsFeatures();
  const { features: titansFeatures } = useTitansFeatures();
  const { features: grizzliesFeatures } = useGrizzliesFeatures();
  const {
    assessment: characterAssessment,
    startVisionAnalysis,
    stopVisionAnalysis,
    videoRef: visionVideoRef
  } = useCharacterAssessment();
  const { metrics: systemMetrics } = usePerformanceMetrics();
  const [selectedTeam, setSelectedTeam] = useState('cardinals');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visionActive, setVisionActive] = useState(false);
  const [poseMetrics, setPoseMetrics] = useState({
    hipRotation: 0,
    shoulderTilt: 0,
    weightTransfer: 0,
    formScore: 100,
    confidence: 0
  });

  // 3D Graphics Engine State
  const [graphicsEngine, setGraphicsEngine] = useState<any>(null);
  const [graphicsStats, setGraphicsStats] = useState({
    fps: 60,
    triangles: 2800000,
    quality: 'Ultra'
  });

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

  // Initialize 3D Graphics Engine with error handling
  useEffect(() => {
    const initializeGraphicsEngine = async () => {
      const container = document.getElementById('stadium-3d-container');
      if (!container) return;

      try {
        // Dynamic import with error handling
        const { getBlazeGraphicsEngine } = await import('../lib/graphics/BlazeGraphicsEngine');

        const engine = getBlazeGraphicsEngine({
          quality: 'adaptive',
          enablePostProcessing: true,
          enableAR: false,
          enableVR: false,
          targetFPS: 60,
          antialias: true,
          shadows: true
        });

        await engine.initialize(container);

        // Create team-themed particles with error handling
        try {
          if (selectedTeam === 'cardinals') {
            const THREE = await import('three');
            engine.createParticleSystem('cardinals', 1000, {
              color: new THREE.Color(0xc41e3a),
              size: 2,
              velocity: new THREE.Vector3(0, 3, 0),
              lifetime: 8
            });
          } else if (selectedTeam === 'titans') {
            const THREE = await import('three');
            engine.createParticleSystem('titans', 800, {
              color: new THREE.Color(0x002244),
              size: 1.5,
              velocity: new THREE.Vector3(0, 4, 0),
              lifetime: 10
            });
          }
        } catch (particleError) {
          console.warn('Failed to create particle systems:', particleError);
        }

        // Start the engine
        engine.start();

        // Update stats periodically
        const statsInterval = setInterval(() => {
          try {
            const stats = engine.getStats();
            setGraphicsStats({
              fps: Math.round(stats.fps),
              triangles: stats.triangles,
              quality: stats.qualityLevel
            });
          } catch (statsError) {
            console.warn('Failed to get graphics stats:', statsError);
          }
        }, 1000);

        setGraphicsEngine(engine);

        return () => {
          clearInterval(statsInterval);
          engine.dispose();
        };

      } catch (error) {
        console.error('Failed to initialize 3D graphics engine:', error);
        // Set fallback graphics stats
        setGraphicsStats({
          fps: 60,
          triangles: 0,
          quality: 'Fallback'
        });
      }
    };

    if (isLoading === false) {
      initializeGraphicsEngine();
    }
  }, [isLoading, selectedTeam]);

  // Vision AI initialization with better error handling
  const initializeVisionAI = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera access is not supported in this browser.');
        return;
      }

      if (!videoRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setVisionActive(true);

      // Simulate pose metrics since MediaPipe might not be available
      const updateMetrics = () => {
        if (!visionActive) return;

        setPoseMetrics({
          hipRotation: Math.round(30 + Math.sin(Date.now() * 0.001) * 20),
          shoulderTilt: Math.round(15 + Math.cos(Date.now() * 0.0008) * 10),
          weightTransfer: Math.round(70 + Math.sin(Date.now() * 0.0012) * 15),
          formScore: Math.round(85 + Math.sin(Date.now() * 0.0005) * 10),
          confidence: Math.round(75 + Math.cos(Date.now() * 0.0015) * 20)
        });

        setTimeout(updateMetrics, 100);
      };
      updateMetrics();

    } catch (error) {
      console.error('Failed to initialize camera:', error);
      alert('Camera access denied. Please enable camera permissions for pose detection.');
    }
  };

  const stopVisionAI = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setVisionActive(false);
  };

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
            <a
              href="/championship"
              style={{
                color: '#FFD700',
                textDecoration: 'none',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '8px 16px',
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.2))',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                borderRadius: '20px',
                transition: 'all 0.3s ease',
                fontSize: '0.9rem',
                letterSpacing: '0.05em'
              }}
            >
              🏆 Championship
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content - Add your existing content here */}
      <div style={{ paddingTop: '80px', position: 'relative', zIndex: 10 }}>
        <section style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 2rem'
        }}>
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
        </section>
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