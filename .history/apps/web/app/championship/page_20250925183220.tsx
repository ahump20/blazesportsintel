'use client';

import { useEffect } from 'react';
import Head from 'next/head';
import './championship.css';

export default function ChampionshipPlatform() {
  useEffect(() => {
    // Load external scripts
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const loadStylesheet = (href: string) => {
      return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
      });
    };

    // Load external dependencies
    const loadDependencies = async () => {
      try {
        await Promise.all([
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'),
          loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'),
          loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'),
          loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js'),
          loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js'),
          loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js'),
          loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js'),
          loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js'),
          loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js'),
          loadScript('https://cdn.jsdelivr.net/npm/chart.js'),
          loadStylesheet('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap'),
        ]);

        // Load the main championship script after dependencies
        await loadScript('/blaze-championship.js');
      } catch (error) {
        console.error('Error loading dependencies:', error);
      }
    };

    loadDependencies();
  }, []);

  return (
    <>
      <Head>
        <title>Blaze Intelligence | Championship Sports Analytics Platform</title>
        <meta name="description" content="Enhanced sports intelligence platform with AI consciousness, neural networks, video analytics, and real-time insights. Integrated features from Replit development environment." />
        <link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" />
      </Head>

      <div className="championship-platform">
        {/* Enhanced AI Consciousness HUD */}
        <div className="ai-consciousness-hud">
          <div className="consciousness-header">
            AI Consciousness: <span id="consciousnessLevel">87.6%</span>
          </div>
          <div className="consciousness-status">
            Status: <span id="consciousnessStatus">Adaptive Intelligence Active</span>
          </div>
          <div className="consciousness-metrics">
            <div className="metric-box">
              <div className="metric-value" id="neuralNodes">25</div>
              <div className="metric-label">Neurons</div>
            </div>
            <div className="metric-box">
              <div className="metric-value" id="neuralSynapses">18</div>
              <div className="metric-label">Synapses</div>
            </div>
            <div className="metric-box">
              <div className="metric-value" id="processingLoad">94.2%</div>
              <div className="metric-label">Processing</div>
            </div>
            <div className="metric-box">
              <div className="metric-value" id="responseTime">47ms</div>
              <div className="metric-label">Response</div>
            </div>
          </div>
        </div>

        {/* Video Intelligence Panel */}
        <div className="video-intelligence-panel">
          <div className="panel-title">Video Intelligence</div>
          <div className="tracking-info">
            Tracking <span className="highlight">33+ keypoints</span>
          </div>
          
          <div className="keypoint-grid">
            <div className="keypoint-item">Head</div>
            <div className="keypoint-item">Shoulders</div>
            <div className="keypoint-item">Elbows</div>
            <div className="keypoint-item">Wrists</div>
            <div className="keypoint-item">Hips</div>
            <div className="keypoint-item">Knees</div>
          </div>

          <div className="biomechanical-analysis">
            <div className="analysis-title">Biomechanical Analysis</div>
            <div className="analysis-metrics">
              <div>Form accuracy: <span className="gold">94.6%</span></div>
              <div>Movement efficiency: <span className="green">92.1%</span></div>
              <div>Character assessment: <span className="blue">Learning</span></div>
            </div>
          </div>
        </div>

        {/* Enhanced Real-time Dashboard */}
        <div className="realtime-dashboard">
          <div className="dashboard-title">Live Sports Intelligence</div>
          
          <div className="metric-row">
            <span className="metric-label">Cardinals Readiness</span>
            <span className="metric-value" id="cardinalsReadiness">86.6%</span>
          </div>
          
          <div className="metric-row">
            <span className="metric-label">Titans Power</span>
            <span className="metric-value" id="titansPower">78</span>
          </div>
          
          <div className="metric-row">
            <span className="metric-label">Longhorns Rank</span>
            <span className="metric-value" id="longhornsRank">#3</span>
          </div>
          
          <div className="metric-row">
            <span className="metric-label">Grizzlies Rating</span>
            <span className="metric-value" id="grizzliesRating">114.7</span>
          </div>

          <div className="metric-row">
            <span className="metric-label">Data Points</span>
            <span className="metric-value" id="dataPoints">2.8M+</span>
          </div>
        </div>

        {/* Loading Screen */}
        <div className="loading-screen" id="loadingScreen">
          <div className="loader"></div>
          <div className="loading-text">
            BLAZE INTELLIGENCE<br />
            <span className="loading-subtitle">Championship Sports Analytics Platform</span>
          </div>
          <div className="loading-progress">
            <div className="loading-bar"></div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button className="mode-btn" onClick={() => window.setViewMode?.('3d')}>3D Universe</button>
          <button className="mode-btn active" onClick={() => window.setViewMode?.('classic')}>Classic View</button>
        </div>

        {/* Professional Header */}
        <div className="header">
          <div className="brand-logo" onClick={() => goHome()}>
            <div className="logo-icon">BI</div>
            <div>
              <div className="brand-text">BLAZE INTELLIGENCE</div>
              <div className="brand-tagline">Where Data Meets Dominance</div>
            </div>
          </div>
          <nav className="nav-menu">
            {/* Navigation will be populated by JavaScript */}
          </nav>
        </div>

        {/* 3D Universe Container */}
        <div id="universe-container">
          <canvas id="universe-canvas"></canvas>

          {/* HUD Overlay */}
          <div className="hud-overlay">
            {/* Mission Statement Panel */}
            <div className="mission-panel fade-in">
              <h2 className="mission-title">Our Mission</h2>
              <p className="mission-text">
                Blaze Intelligence transforms college athletics through championship-level data analytics.
                We provide SEC programs and elite institutions with the intelligence needed to dominate
                in the NIL era.
              </p>
              <div className="mission-stats">
                <div className="mission-stat">
                  <div className="mission-stat-value">$196M+</div>
                  <div className="mission-stat-label">SEC NIL Tracked</div>
                </div>
                <div className="mission-stat">
                  <div className="mission-stat-value">50</div>
                  <div className="mission-stat-label">Programs Analyzed</div>
                </div>
                <div className="mission-stat">
                  <div className="mission-stat-value">24/7</div>
                  <div className="mission-stat-label">Real-Time Data</div>
                </div>
                <div className="mission-stat">
                  <div className="mission-stat-value">94.6%</div>
                  <div className="mission-stat-label">Prediction Accuracy</div>
                </div>
              </div>
            </div>

            {/* Live Metrics Dashboard */}
            <div className="metrics-dashboard fade-in">
              <div className="metrics-title">
                <div className="live-indicator"></div>
                LIVE METRICS
              </div>

              <div className="metric-item">
                <div className="metric-header">
                  <span className="metric-label">Texas NIL Value</span>
                  <span className="metric-change positive">+$2.1M</span>
                </div>
                <div className="metric-value">$22.0M</div>
              </div>

              <div className="metric-item">
                <div className="metric-header">
                  <span className="metric-label">Active Transfers</span>
                  <span className="metric-change positive">+12</span>
                </div>
                <div className="metric-value">247</div>
              </div>

              <div className="metric-item">
                <div className="metric-header">
                  <span className="metric-label">Championship Probability</span>
                  <span className="metric-change positive">+4.2%</span>
                </div>
                <div className="metric-value">78.3%</div>
              </div>

              <div className="metric-item">
                <div className="metric-header">
                  <span className="metric-label">Data Points Analyzed</span>
                  <span className="metric-change positive">LIVE</span>
                </div>
                <div className="metric-value" id="dataPointsLive">2.8M+</div>
              </div>
            </div>

            {/* Control Panel */}
            <div className="control-panel">
              <button className="control-btn active" onClick={() => setUniverseMode('explore')}>Explore</button>
              <button className="control-btn" onClick={() => setUniverseMode('analytics')}>Analytics</button>
              <button className="control-btn" onClick={() => setUniverseMode('heatmap')}>Heat Map</button>
              <button className="control-btn" onClick={() => setUniverseMode('connections')}>Network</button>
              <button className="control-btn" onClick={() => toggleFullscreen()}>Fullscreen</button>
            </div>

            {/* Mini Map */}
            <div className="mini-map">
              <canvas id="miniMapCanvas"></canvas>
            </div>
          </div>
        </div>

        {/* Classic Dashboard Container */}
        <div id="classic-container">
          <div className="classic-dashboard">
            <section className="deployment-hero">
              <div className="hero-intro">
                <h1 className="deployment-hero-title">Choose Your Blaze Intelligence Experience</h1>
                <p className="hero-subtitle">Launch the deployment tailored to your role—from unified HQ operations to executive storytelling and immersive demos.</p>
              </div>
              <div className="hero-cta-grid">
                <a href="https://blaze-intelligence.netlify.app/" target="_blank" rel="noopener noreferrer" className="hero-cta">
                  <span className="hero-cta-label">Unified Command Center</span>
                  <span className="hero-cta-description">Operations-grade dashboard that unifies recruiting, NIL, and performance analytics for daily decision cycles.</span>
                  <span className="hero-cta-action">Launch Unified HQ</span>
                </a>
                <a href="https://blaze-intelligence-main.netlify.app/" target="_blank" rel="noopener noreferrer" className="hero-cta hero-cta--main">
                  <span className="hero-cta-label">Executive Mainline</span>
                  <span className="hero-cta-description">Investor-ready storyline with curated KPIs, valuations, and go-to-market proof for stakeholders.</span>
                  <span className="hero-cta-action">Open Executive Main</span>
                </a>
                <a href="https://blaze-3d.netlify.app/" target="_blank" rel="noopener noreferrer" className="hero-cta hero-cta--3d">
                  <span className="hero-cta-label">Immersive 3D Showcase</span>
                  <span className="hero-cta-description">WebGL-powered universe built for live demos, highlight reels, and spatial data exploration.</span>
                  <span className="hero-cta-action">Enter Immersive 3D</span>
                </a>
              </div>
            </section>

            <section className="deployment-differentiators">
              <h2 className="differentiator-title"><span>Deployment Differentiators</span></h2>
              <p className="differentiator-subtitle">Quickly compare the value of each environment and guide coaches, executives, or partners into the optimal Netlify experience.</p>
              <div className="differentiator-grid">
                <article className="differentiator-card">
                  <h3>Unified Command Center</h3>
                  <p>Purpose-built for coaching staffs and analysts who need always-on situational awareness.</p>
                  <ul>
                    <li>Live NIL valuations paired with roster and market context.</li>
                    <li>Automated alerting across recruiting, transfer, and health signals.</li>
                    <li>Secure workspace tuned for day-to-day program operations.</li>
                  </ul>
                  <a href="https://blaze-intelligence.netlify.app/" target="_blank" rel="noopener noreferrer" className="card-link">Explore Unified HQ</a>
                </article>
                <article className="differentiator-card differentiator-card--main">
                  <h3>Executive Mainline</h3>
                  <p>Delivers the polished narrative for investors, athletic directors, and strategic partners.</p>
                  <ul>
                    <li>Narrative-first modules featuring sponsor-ready KPIs.</li>
                    <li>Conversion-focused experiences for fundraising and media deals.</li>
                    <li>Executive summary flows with embedded partnership CTAs.</li>
                  </ul>
                  <a href="https://blaze-intelligence-main.netlify.app/" target="_blank" rel="noopener noreferrer" className="card-link">Visit Executive Main</a>
                </article>
                <article className="differentiator-card differentiator-card--3d">
                  <h3>Immersive 3D Showcase</h3>
                  <p>Transforms Blaze Intelligence into an interactive universe for events, fan activations, and premium demos.</p>
                  <ul>
                    <li>Three.js-powered spatial storytelling with cinematic visuals.</li>
                    <li>Immersive scenes that spotlight prospects, fans, and donors.</li>
                    <li>Tap-to-explore overlays synchronized with live performance metrics.</li>
                  </ul>
                  <a href="https://blaze-3d.netlify.app/" target="_blank" rel="noopener noreferrer" className="card-link">Launch Immersive 3D</a>
                </article>
              </div>
            </section>

            <div className="dashboard-header">
              <h1 className="dashboard-title">Championship Intelligence Dashboard</h1>
              <p className="dashboard-subtitle">Real-Time NIL Analytics & Sports Intelligence Platform</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3 className="card-title">🏆 SEC NIL Leadership</h3>
                <div className="card-content">
                  <p><strong>Texas:</strong> $22.0M (Arch Manning: $6.8M)</p>
                  <p><strong>Alabama:</strong> $18.4M (Ryan Williams: $2.6M)</p>
                  <p><strong>LSU:</strong> $17.9M (+77.2% YoY)</p>
                  <p><strong>Georgia:</strong> $15.7M (Championship DNA)</p>
                </div>
              </div>

              <div className="dashboard-card">
                <h3 className="card-title">📊 Platform Capabilities</h3>
                <div className="card-content">
                  <ul className="capabilities-list">
                    <li>✓ Real-time NIL valuations</li>
                    <li>✓ Transfer portal predictions</li>
                    <li>✓ Recruiting intelligence</li>
                    <li>✓ Performance analytics</li>
                    <li>✓ Championship probability modeling</li>
                  </ul>
                </div>
              </div>

              <div className="dashboard-card">
                <h3 className="card-title">🎯 Key Insights</h3>
                <div className="card-content">
                  <p>• SEC commands 40% of all FBS NIL spending</p>
                  <p>• Average top-10 program value: $16.57M</p>
                  <p>• QB position premium: 3-5x multiplier</p>
                  <p>• Social media impact: Up to 2x value boost</p>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="data-table">
              <div className="table-header">
                <h3 className="table-title">Top 10 NIL Programs (2025-26)</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Program</th>
                    <th>Total Value</th>
                    <th>Avg/Player</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody id="nilTableBody">
                  {/* Data will be populated by JavaScript */}
                </tbody>
              </table>
            </div>

            {/* Charts Section */}
            <div className="charts-container">
              <div className="chart-card">
                <h3 className="card-title">Conference NIL Distribution</h3>
                <canvas id="conferenceChart"></canvas>
              </div>

              <div className="chart-card">
                <h3 className="card-title">Year-over-Year Growth</h3>
                <canvas id="growthChart"></canvas>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="success-message" id="successMessage">
          System Updated Successfully
        </div>
      </div>
    </>
  );
}

// Global functions that will be available in the browser
declare global {
  interface Window {
    setViewMode: (mode: string) => void;
    setUniverseMode: (mode: string) => void;
    goHome: () => void;
    toggleFullscreen: () => void;
  }
}

// These functions will be attached to the window object by the JavaScript modules
if (typeof window !== 'undefined') {
  window.setViewMode = (mode: string) => {
    console.log('Setting view mode to:', mode);
  };
  
  window.setUniverseMode = (mode: string) => {
    console.log('Setting universe mode to:', mode);
  };
  
  window.goHome = () => {
    console.log('Going home');
  };
  
  window.toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };
}
