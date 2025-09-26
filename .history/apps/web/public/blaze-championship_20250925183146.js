// Blaze Intelligence Championship Platform - Main JavaScript Module
// Enhanced sports intelligence platform with AI consciousness, neural networks, video analytics, and real-time insights

// Global Variables
let scene, camera, renderer, composer;
let controls;
let stadiums = [];
let connections = [];
let particles = [];
let dataPoints = 2800000;
let currentViewMode = 'classic';
let currentUniverseMode = 'explore';
let animationId;

// Championship Programs Data
const programs = [
  { name: 'Texas', value: 22.0, color: 0xBF5700, position: { x: 0, y: 0, z: 0 }, conference: 'SEC' },
  { name: 'Alabama', value: 18.4, color: 0x9E1B32, position: { x: 500, y: 50, z: -300 }, conference: 'SEC' },
  { name: 'LSU', value: 17.9, color: 0x461D7C, position: { x: -400, y: 100, z: 200 }, conference: 'SEC' },
  { name: 'Georgia', value: 15.7, color: 0xBA0C2F, position: { x: 300, y: -50, z: 400 }, conference: 'SEC' },
  { name: 'Texas A&M', value: 14.3, color: 0x500000, position: { x: -200, y: 150, z: -500 }, conference: 'SEC' },
  { name: 'Penn State', value: 14.6, color: 0x002244, position: { x: 700, y: 0, z: 200 }, conference: 'Big Ten' },
  { name: 'Ohio State', value: 18.3, color: 0xBB0000, position: { x: -600, y: 100, z: -100 }, conference: 'Big Ten' },
  { name: 'Tennessee', value: 11.5, color: 0xFF8200, position: { x: 400, y: -100, z: -300 }, conference: 'SEC' },
  { name: 'Oklahoma', value: 12.6, color: 0x841617, position: { x: -500, y: 200, z: 300 }, conference: 'SEC' },
  { name: 'Michigan', value: 13.0, color: 0x00274C, position: { x: 200, y: 250, z: 100 }, conference: 'Big Ten' }
];

// Enhanced AI Consciousness Engine
class AIConsciousnessEngine {
  constructor() {
    this.level = 87.6;
    this.neurons = 25;
    this.synapses = 18;
    this.processing = 94.2;
    this.responseTime = 47;
    this.isActive = false;
  }

  start() {
    this.isActive = true;
    this.updateLoop();
    this.connectToConsciousnessStream();
  }

  updateLoop() {
    if (!this.isActive) return;

    // Simulate consciousness fluctuations
    this.level = Math.max(82, Math.min(95, this.level + (Math.random() - 0.5) * 2));
    this.neurons = 25 + Math.floor(Math.random() * 10);
    this.synapses = 15 + Math.floor(Math.random() * 8);
    this.processing = 90 + Math.random() * 8;
    this.responseTime = 40 + Math.floor(Math.random() * 20);

    this.updateDisplay();
    setTimeout(() => this.updateLoop(), 3000);
  }

  updateDisplay() {
    const levelEl = document.getElementById('consciousnessLevel');
    const statusEl = document.getElementById('consciousnessStatus');
    const nodesEl = document.getElementById('neuralNodes');
    const synapsesEl = document.getElementById('neuralSynapses');
    const processingEl = document.getElementById('processingLoad');
    const responseEl = document.getElementById('responseTime');

    if (levelEl) levelEl.textContent = this.level.toFixed(1) + '%';
    if (nodesEl) nodesEl.textContent = this.neurons;
    if (synapsesEl) synapsesEl.textContent = this.synapses;
    if (processingEl) processingEl.textContent = this.processing.toFixed(1) + '%';
    if (responseEl) responseEl.textContent = this.responseTime + 'ms';

    // Update status
    const status = this.level >= 90 ? 'Peak Performance' :
                  this.level >= 85 ? 'Adaptive Intelligence Active' :
                  'Standard Processing';
    if (statusEl) statusEl.textContent = status;
  }

  connectToConsciousnessStream() {
    // Try to connect to real consciousness stream
    try {
      const eventSource = new EventSource('/consciousness-stream.js');
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.processConsciousnessData(data);
      };
    } catch (error) {
      console.log('Consciousness stream not available, using simulation');
    }
  }

  processConsciousnessData(data) {
    if (data.consciousness) {
      this.level = data.consciousness.level;
      this.neurons = data.consciousness.nodes;
    }
    if (data.neural) {
      this.synapses = data.neural.synapses / 1000;
      this.processing = data.neural.processing;
    }
    this.updateDisplay();
  }
}

// Enhanced Sports Data Streamer
class SportsDataStreamer {
  constructor() {
    this.isStreaming = false;
    this.updateInterval = null;
  }

  start() {
    this.isStreaming = true;
    this.updateSportsData();
    this.updateInterval = setInterval(() => this.updateSportsData(), 5000);
  }

  updateSportsData() {
    // Cardinals
    const cardinalsEl = document.getElementById('cardinalsReadiness');
    if (cardinalsEl) {
      const cardinalsReadiness = 86.6 + (Math.random() - 0.5) * 6;
      cardinalsEl.textContent = cardinalsReadiness.toFixed(1) + '%';
    }

    // Titans
    const titansEl = document.getElementById('titansPower');
    if (titansEl) {
      const titansPower = 78 + Math.floor(Math.random() * 8);
      titansEl.textContent = titansPower;
    }

    // Grizzlies
    const grizzliesEl = document.getElementById('grizzliesRating');
    if (grizzliesEl) {
      const grizzliesRating = 114.7 + (Math.random() - 0.5) * 8;
      grizzliesEl.textContent = grizzliesRating.toFixed(1);
    }

    // Data points
    const dataEl = document.getElementById('dataPoints');
    if (dataEl) {
      const dataPoints = (2.8 + Math.random() * 0.4).toFixed(1);
      dataEl.textContent = dataPoints + 'M+';
    }
  }

  stop() {
    this.isStreaming = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Initialize Application
function init() {
  if (currentViewMode === '3d') {
    initUniverse();
  }
  initClassicView();
  // Initialize charts for classic view since it's the default
  setTimeout(() => initCharts(), 500);
  startDataUpdates();

  // Hide loading screen
  setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
  }, 2000);
}

// Initialize 3D Universe
function initUniverse() {
  if (typeof THREE === 'undefined') {
    console.error('Three.js not loaded');
    return;
  }

  // Scene setup
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 1000, 10000);

  // Camera setup
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    50000
  );
  camera.position.set(0, 500, 1500);

  // Renderer setup
  const canvas = document.getElementById('universe-canvas');
  if (!canvas) return;

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Controls
  if (typeof THREE.OrbitControls !== 'undefined') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 5000;
    controls.minDistance = 100;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
  }

  // Post-processing
  setupPostProcessing();

  // Create universe elements
  createStarField();
  createStadiums();
  createConnections();
  createDataParticles();
  setupLighting();

  // Start animation
  animate();
}

function setupPostProcessing() {
  if (typeof THREE.EffectComposer === 'undefined') return;

  composer = new THREE.EffectComposer(renderer);
  const renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2,  // strength
    0.4,  // radius
    0.85  // threshold
  );
  composer.addPass(bloomPass);
}

function createStarField() {
  if (typeof THREE === 'undefined') return;

  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const colors = [];

  for (let i = 0; i < 5000; i++) {
    vertices.push(
      (Math.random() - 0.5) * 8000,
      (Math.random() - 0.5) * 8000,
      (Math.random() - 0.5) * 8000
    );

    const intensity = Math.random();
    colors.push(intensity, intensity, intensity * 0.8);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  particles.push(stars);
}

function createStadiums() {
  if (typeof THREE === 'undefined') return;

  const stadiumGroup = new THREE.Group();

  programs.forEach((program, index) => {
    const group = new THREE.Group();

    // Stadium base - cylindrical structure
    const stadiumGeometry = new THREE.CylinderGeometry(
      80 + program.value * 4,
      60 + program.value * 3,
      40 + program.value * 2,
      32,
      1,
      true
    );

    const stadiumMaterial = new THREE.MeshPhysicalMaterial({
      color: program.color,
      metalness: 0.6,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      emissive: program.color,
      emissiveIntensity: 0.1
    });

    const stadium = new THREE.Mesh(stadiumGeometry, stadiumMaterial);
    stadium.castShadow = true;
    stadium.receiveShadow = true;
    group.add(stadium);

    // Field
    const fieldGeometry = new THREE.CircleGeometry(70 + program.value * 2, 32);
    const fieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x00AA00,
      roughness: 0.8,
      metalness: 0.1
    });
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.rotation.x = -Math.PI / 2;
    field.position.y = -(20 + program.value);
    field.receiveShadow = true;
    group.add(field);

    // Value ring
    const ringGeometry = new THREE.TorusGeometry(
      120 + program.value * 3,
      2,
      8,
      64
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x9BCBEB,
      transparent: true,
      opacity: 0.4
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Text sprite
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;

    // Background
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, 512, 256);

    // Text
    context.fillStyle = '#FFD700';
    context.font = 'bold 48px Inter';
    context.fillText(program.name, 20, 60);

    context.fillStyle = '#9BCBEB';
    context.font = '36px Inter';
    context.fillText(`$${program.value}M NIL`, 20, 110);

    context.fillStyle = '#FFFFFF';
    context.font = '28px Inter';
    context.fillText(program.conference, 20, 150);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(200, 100, 1);
    sprite.position.y = 150 + program.value * 2;
    group.add(sprite);

    // Position in space
    group.position.set(
      program.position.x,
      program.position.y,
      program.position.z
    );

    // Store data for animation
    group.userData = {
      name: program.name,
      value: program.value,
      baseY: program.position.y,
      orbitRadius: Math.sqrt(program.position.x ** 2 + program.position.z ** 2),
      orbitSpeed: 0.0005 / (index + 1),
      angle: Math.atan2(program.position.z, program.position.x)
    };

    stadiumGroup.add(group);
    stadiums.push(group);
  });

  scene.add(stadiumGroup);
}

function createConnections() {
  if (typeof THREE === 'undefined') return;

  const connectionGroup = new THREE.Group();

  stadiums.forEach((stadium1, i) => {
    stadiums.forEach((stadium2, j) => {
      if (i < j && Math.random() > 0.6) {
        const distance = stadium1.position.distanceTo(stadium2.position);
        const opacity = Math.max(0.1, 1 - distance / 2000);

        const points = [];
        points.push(stadium1.position.clone());

        // Add curve
        const midPoint = new THREE.Vector3();
        midPoint.lerpVectors(stadium1.position, stadium2.position, 0.5);
        midPoint.y += 100 + Math.random() * 100;
        points.push(midPoint);

        points.push(stadium2.position.clone());

        const curve = new THREE.CatmullRomCurve3(points);
        const curvePoints = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);

        const material = new THREE.LineBasicMaterial({
          color: 0x9BCBEB,
          transparent: true,
          opacity: opacity * 0.3,
          blending: THREE.AdditiveBlending
        });

        const line = new THREE.Line(geometry, material);
        connectionGroup.add(line);
        connections.push(line);
      }
    });
  });

  scene.add(connectionGroup);
}

function createDataParticles() {
  if (typeof THREE === 'undefined') return;

  const particleCount = 2000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const radius = 100 + Math.random() * 1500;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = (Math.random() - 0.5) * 1000;
    positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const color = new THREE.Color();
    color.setHSL(0.08 + Math.random() * 0.1, 0.8, 0.6);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;

    sizes[i] = Math.random() * 5 + 1;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });

  const dataCloud = new THREE.Points(geometry, material);
  dataCloud.userData.isDataCloud = true;
  scene.add(dataCloud);
  particles.push(dataCloud);
}

function setupLighting() {
  if (typeof THREE === 'undefined') return;

  // Ambient light
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  scene.add(ambientLight);

  // Main directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(500, 1000, 500);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.left = -2000;
  directionalLight.shadow.camera.right = 2000;
  directionalLight.shadow.camera.top = 2000;
  directionalLight.shadow.camera.bottom = -2000;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  // Stadium spotlights
  stadiums.forEach((stadium, index) => {
    const pointLight = new THREE.PointLight(
      programs[index].color,
      1.5,
      400
    );
    pointLight.position.copy(stadium.position);
    pointLight.position.y += 100;
    scene.add(pointLight);
  });
}

function animate() {
  animationId = requestAnimationFrame(animate);

  const time = Date.now() * 0.001;

  // Update controls
  if (controls) {
    controls.update();
  }

  // Animate stadiums
  stadiums.forEach((stadium, index) => {
    if (currentUniverseMode === 'explore' || currentUniverseMode === 'connections') {
      // Orbital motion
      stadium.userData.angle += stadium.userData.orbitSpeed;
      stadium.position.x = Math.cos(stadium.userData.angle) * stadium.userData.orbitRadius;
      stadium.position.z = Math.sin(stadium.userData.angle) * stadium.userData.orbitRadius;
    }

    // Vertical oscillation
    stadium.position.y = stadium.userData.baseY + Math.sin(time + index) * 10;

    // Rotation
    stadium.rotation.y += 0.001;

    // Pulse effect
    const scale = 1 + Math.sin(time * 2 + index) * 0.02;
    stadium.scale.set(scale, scale, scale);
  });

  // Animate particles
  particles.forEach(particleSystem => {
    if (particleSystem.userData.isDataCloud) {
      particleSystem.rotation.y += 0.0002;
      const positions = particleSystem.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(time + i) * 0.2;
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;
    } else {
      particleSystem.rotation.y += 0.0001;
    }
  });

  // Animate connections
  connections.forEach((connection, index) => {
    const opacity = 0.1 + Math.abs(Math.sin(time * 0.5 + index)) * 0.2;
    connection.material.opacity = opacity;
  });

  // Render
  if (composer) {
    composer.render();
  } else if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }

  // Update mini map
  updateMiniMap();
}

function updateMiniMap() {
  const canvas = document.getElementById('miniMapCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = 180;
  canvas.height = 180;

  // Clear
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(0, 0, 180, 180);

  // Grid
  ctx.strokeStyle = 'rgba(191, 87, 0, 0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 180; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 180);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(180, i);
    ctx.stroke();
  }

  // Draw stadiums
  stadiums.forEach((stadium, index) => {
    const x = (stadium.position.x / 1500) * 90 + 90;
    const z = (stadium.position.z / 1500) * 90 + 90;

    ctx.fillStyle = `#${programs[index].color.toString(16).padStart(6, '0')}`;
    ctx.beginPath();
    ctx.arc(x, z, 4 + programs[index].value / 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.font = '8px Inter';
    ctx.fillText(programs[index].name, x - 15, z - 8);
  });

  // Camera position
  if (camera) {
    const camX = (camera.position.x / 1500) * 90 + 90;
    const camZ = (camera.position.z / 1500) * 90 + 90;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(camX - 3, camZ - 3, 6, 6);
  }
}

// Initialize Classic View
function initClassicView() {
  populateNILTable();
  if (currentViewMode === 'classic') {
    initCharts();
  }
}

function populateNILTable() {
  const tableBody = document.getElementById('nilTableBody');
  if (!tableBody) return;

  const top10 = programs.slice(0, 10);
  tableBody.innerHTML = top10.map((program, index) => `
    <tr>
      <td>${index + 1}</td>
      <td style="color: #${program.color.toString(16).padStart(6, '0')}">${program.name}</td>
      <td>$${program.value.toFixed(1)}M</td>
      <td>$${(program.value * 1000 / 85).toFixed(0)}K</td>
      <td><span style="color: #10B981;">↑ Rising</span></td>
    </tr>
  `).join('');
}

function initCharts() {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded');
    return;
  }

  // Conference Distribution Chart
  const confCtx = document.getElementById('conferenceChart');
  if (confCtx) {
    new Chart(confCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12'],
        datasets: [{
          data: [98.7, 58.9, 25.6, 24.8, 21.4],
          backgroundColor: [
            'rgba(191, 87, 0, 0.8)',
            'rgba(0, 34, 68, 0.8)',
            'rgba(255, 215, 0, 0.8)',
            'rgba(155, 203, 235, 0.8)',
            'rgba(158, 27, 50, 0.8)'
          ],
          borderWidth: 2,
          borderColor: '#000'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#fff' }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.label + ': $' + context.parsed + 'M';
              }
            }
          }
        }
      }
    });
  }

  // Growth Chart
  const growthCtx = document.getElementById('growthChart');
  if (growthCtx) {
    new Chart(growthCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: ['2021', '2022', '2023', '2024', '2025'],
        datasets: [{
          label: 'Total NIL Value',
          data: [45, 78, 124, 168, 229],
          borderColor: 'rgba(255, 215, 0, 1)',
          backgroundColor: 'rgba(255, 215, 0, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { color: '#fff' }
          }
        },
        scales: {
          y: {
            ticks: {
              color: '#fff',
              callback: function(value) {
                return '$' + value + 'M';
              }
            },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          },
          x: {
            ticks: { color: '#fff' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        }
      }
    });
  }
}

// View Mode Functions
function setViewMode(mode) {
  currentViewMode = mode;

  const buttons = document.querySelectorAll('.mode-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  // Find the clicked button and add active class
  const clickedButton = Array.from(buttons).find(btn => 
    btn.textContent.toLowerCase().includes(mode.toLowerCase())
  );
  if (clickedButton) {
    clickedButton.classList.add('active');
  }

  if (mode === '3d') {
    document.getElementById('universe-container').style.display = 'block';
    document.getElementById('classic-container').style.display = 'none';

    if (!renderer) {
      initUniverse();
    }
  } else {
    document.getElementById('universe-container').style.display = 'none';
    document.getElementById('classic-container').style.display = 'block';

    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    setTimeout(() => initCharts(), 100);
  }

  showSuccess('View mode changed to ' + mode.toUpperCase());
}

function setUniverseMode(mode) {
  currentUniverseMode = mode;

  // Update button states
  document.querySelectorAll('.control-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Find the clicked button and add active class
  const clickedButton = Array.from(document.querySelectorAll('.control-btn')).find(btn => 
    btn.textContent.toLowerCase().includes(mode.toLowerCase())
  );
  if (clickedButton) {
    clickedButton.classList.add('active');
  }

  // Apply mode-specific changes
  switch(mode) {
    case 'analytics':
      if (controls) {
        controls.autoRotate = false;
        camera.position.set(0, 2000, 0);
        camera.lookAt(0, 0, 0);
      }
      showConnections(false);
      break;

    case 'heatmap':
      if (controls) {
        controls.autoRotate = false;
      }
      // Color stadiums by value
      stadiums.forEach((stadium, index) => {
        const intensity = programs[index].value / 22; // Normalize to Texas max
        stadium.children[0].material.emissiveIntensity = intensity * 0.5;
      });
      break;

    case 'connections':
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
      }
      showConnections(true);
      break;

    case 'explore':
    default:
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.3;
      }
      showConnections(true);
      // Reset emissive
      stadiums.forEach(stadium => {
        stadium.children[0].material.emissiveIntensity = 0.1;
      });
  }
}

function showConnections(show) {
  connections.forEach(connection => {
    connection.visible = show;
  });
}

// Data Updates
function startDataUpdates() {
  setInterval(() => {
    // Update data points
    dataPoints += Math.floor(Math.random() * 1000);
    const element = document.getElementById('dataPointsLive');
    if (element) {
      element.textContent = (dataPoints / 1000000).toFixed(1) + 'M+';
    }

    // Simulate metric changes
    if (Math.random() > 0.7) {
      const metrics = document.querySelectorAll('.metric-value');
      const randomMetric = metrics[Math.floor(Math.random() * metrics.length)];
      if (randomMetric && randomMetric.id !== 'dataPointsLive') {
        const currentValue = parseFloat(randomMetric.textContent);
        const change = (Math.random() - 0.5) * 2;
        randomMetric.textContent = (currentValue + change).toFixed(1) +
            (randomMetric.textContent.includes('%') ? '%' : '');
      }
    }
  }, 2000);
}

// Utility Functions
function goHome() {
  if (currentViewMode === '3d' && camera && controls) {
    camera.position.set(0, 500, 1500);
    controls.reset();
  }
  window.scrollTo(0, 0);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function showSuccess(message) {
  const successEl = document.getElementById('successMessage');
  if (successEl) {
    successEl.textContent = message;
    successEl.style.display = 'block';
    setTimeout(() => {
      successEl.style.display = 'none';
    }, 3000);
  }
}

// Event Listeners
window.addEventListener('resize', () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) {
      composer.setSize(window.innerWidth, window.innerHeight);
    }
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  switch(e.key) {
    case '1': setUniverseMode('explore'); break;
    case '2': setUniverseMode('analytics'); break;
    case '3': setUniverseMode('heatmap'); break;
    case '4': setUniverseMode('connections'); break;
    case 'f': toggleFullscreen(); break;
    case 'r': goHome(); break;
    case ' ':
      if (controls) controls.autoRotate = !controls.autoRotate;
      break;
  }
});

// Initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', init);

  // Attach functions to window for global access
  window.setViewMode = setViewMode;
  window.setUniverseMode = setUniverseMode;
  window.goHome = goHome;
  window.toggleFullscreen = toggleFullscreen;
}

// Performance monitoring
let lastTime = Date.now();
let frames = 0;

function updateFPS() {
  frames++;
  const currentTime = Date.now();
  if (currentTime >= lastTime + 1000) {
    const fps = Math.round((frames * 1000) / (currentTime - lastTime));
    // Could display FPS if needed
    frames = 0;
    lastTime = currentTime;
  }
}

console.log('%c🏆 BLAZE INTELLIGENCE CHAMPIONSHIP PLATFORM',
  'color: #FFD700; font-size: 20px; font-weight: bold;');
console.log('%cProfessional Sports Analytics Platform - v2.0',
  'color: #9BCBEB; font-size: 14px;');

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AIConsciousnessEngine,
    SportsDataStreamer,
    init,
    setViewMode,
    setUniverseMode,
    goHome,
    toggleFullscreen
  };
}
