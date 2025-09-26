/**
 * =============================================================================
 * CHAMPIONSHIP-TIER WEBGL SHADERS
 * =============================================================================
 * High-performance shaders for blazesportsintel.com graphics engine
 * Optimized for 60fps rendering with advanced visual effects
 * =============================================================================
 */

// =============================================================================
// PARTICLE SYSTEM SHADERS
// =============================================================================

export const championshipParticleVertex = `
  attribute vec3 velocity;
  attribute float size;
  attribute float lifetime;
  attribute vec3 customColor;

  varying vec3 vColor;
  varying float vLifetime;
  varying float vIntensity;

  uniform float time;
  uniform vec3 acceleration;
  uniform float turbulence;
  uniform vec3 wind;

  // Noise function for organic movement
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
  }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vColor = customColor.rgb;
    vLifetime = lifetime;

    // Calculate particle age
    float age = mod(time, lifetime);
    float normalizedAge = age / lifetime;

    // Physics-based motion
    vec3 pos = position;
    pos += velocity * age;
    pos += 0.5 * acceleration * age * age;

    // Add turbulence
    vec3 turbulenceOffset = vec3(
      snoise(vec3(position.x * 0.1, position.y * 0.1, time * 0.5)),
      snoise(vec3(position.y * 0.1, position.z * 0.1, time * 0.5)),
      snoise(vec3(position.z * 0.1, position.x * 0.1, time * 0.5))
    ) * turbulence;
    pos += turbulenceOffset;

    // Add wind effect
    pos += wind * age;

    // Wrap around boundaries for infinite effect
    pos = mod(pos + 50.0, 100.0) - 50.0;

    // Calculate intensity based on lifetime
    vIntensity = 1.0 - normalizedAge;
    vIntensity = smoothstep(0.0, 0.1, vIntensity) * smoothstep(1.0, 0.8, normalizedAge);

    // Project to screen
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // Size attenuation with distance
    float sizeAttenuation = 300.0 / -mvPosition.z;
    gl_PointSize = size * sizeAttenuation * (1.0 + sin(time * 2.0 + position.x) * 0.2);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const championshipParticleFragment = `
  varying vec3 vColor;
  varying float vLifetime;
  varying float vIntensity;

  uniform sampler2D texture;
  uniform float time;
  uniform bool useTexture;
  uniform vec3 glowColor;
  uniform float glowIntensity;

  void main() {
    // Circular particle shape
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    if (dist > 0.5) discard;

    // Base color
    vec3 color = vColor;

    // Apply texture if available
    if (useTexture) {
      vec4 texColor = texture2D(texture, gl_PointCoord);
      color *= texColor.rgb;
    }

    // Add glow effect
    float glow = 1.0 - dist * 2.0;
    glow = pow(glow, 2.0);
    color += glowColor * glow * glowIntensity;

    // Pulsing effect
    float pulse = 1.0 + sin(time * 3.0 + vLifetime) * 0.1;
    color *= pulse;

    // Soft edge
    float alpha = smoothstep(0.5, 0.3, dist) * vIntensity;

    // HDR-ready output
    color = pow(color, vec3(2.2)); // Gamma correction

    gl_FragColor = vec4(color, alpha);
  }
`;

// =============================================================================
// HEAT MAP SHADERS
// =============================================================================

export const heatMapVertex = `
  attribute float intensity;

  varying float vIntensity;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  uniform float time;
  uniform float waveAmplitude;
  uniform float waveFrequency;

  void main() {
    vIntensity = intensity;
    vUv = uv;

    // Add wave effect to heat map
    vec3 pos = position;
    float wave = sin(position.x * waveFrequency + time * 2.0) *
                 cos(position.z * waveFrequency + time * 1.5) *
                 waveAmplitude * intensity;
    pos.y += wave;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const heatMapFragment = `
  varying float vIntensity;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  uniform float time;
  uniform sampler2D colorRamp;
  uniform float minThreshold;
  uniform float maxThreshold;
  uniform vec3 hotColor;
  uniform vec3 coldColor;
  uniform float opacity;
  uniform bool useGrid;
  uniform float gridSize;

  void main() {
    // Normalize intensity to threshold range
    float normalizedIntensity = smoothstep(minThreshold, maxThreshold, vIntensity);

    // Sample from color ramp or interpolate between hot/cold
    vec3 color;
    if (colorRamp != null) {
      color = texture2D(colorRamp, vec2(normalizedIntensity, 0.5)).rgb;
    } else {
      // Multi-stop gradient for better visualization
      if (normalizedIntensity < 0.25) {
        color = mix(coldColor, vec3(0.0, 0.0, 1.0), normalizedIntensity * 4.0);
      } else if (normalizedIntensity < 0.5) {
        color = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), (normalizedIntensity - 0.25) * 4.0);
      } else if (normalizedIntensity < 0.75) {
        color = mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 0.0), (normalizedIntensity - 0.5) * 4.0);
      } else {
        color = mix(vec3(1.0, 1.0, 0.0), hotColor, (normalizedIntensity - 0.75) * 4.0);
      }
    }

    // Add grid overlay if enabled
    float gridAlpha = 0.0;
    if (useGrid) {
      vec2 grid = abs(fract(vWorldPos.xz / gridSize) - 0.5);
      gridAlpha = 1.0 - smoothstep(0.48, 0.5, max(grid.x, grid.y)) * 0.3;
    }

    // Pulsing effect for high intensity areas
    float pulse = 1.0;
    if (normalizedIntensity > 0.8) {
      pulse = 1.0 + sin(time * 4.0) * 0.1;
    }

    color *= pulse;

    // Edge fade for smooth blending
    float edgeFade = smoothstep(0.0, 0.1, vUv.x) *
                     smoothstep(1.0, 0.9, vUv.x) *
                     smoothstep(0.0, 0.1, vUv.y) *
                     smoothstep(1.0, 0.9, vUv.y);

    float finalAlpha = mix(normalizedIntensity, 1.0, gridAlpha) * opacity * edgeFade;

    gl_FragColor = vec4(color, finalAlpha);
  }
`;

// =============================================================================
// VOLUMETRIC FOG SHADERS
// =============================================================================

export const volumetricFogVertex = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;

    vec4 mvPosition = viewMatrix * worldPos;
    vViewDir = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const volumetricFogFragment = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  uniform float time;
  uniform vec3 fogColor;
  uniform float fogDensity;
  uniform float fogHeight;
  uniform vec3 lightPosition;
  uniform vec3 lightColor;
  uniform float lightIntensity;
  uniform sampler2D noiseTexture;

  // Ray marching for volumetric effect
  vec3 rayMarch(vec3 rayOrigin, vec3 rayDir, float maxDist, int steps) {
    vec3 accumFog = vec3(0.0);
    float accumDensity = 0.0;
    float stepSize = maxDist / float(steps);

    for (int i = 0; i < steps; i++) {
      if (accumDensity >= 0.99) break;

      float dist = float(i) * stepSize;
      vec3 samplePos = rayOrigin + rayDir * dist;

      // Height-based fog density
      float heightFactor = exp(-abs(samplePos.y - fogHeight) * 0.5);

      // Animated noise for organic movement
      vec2 noiseCoord = samplePos.xz * 0.01 + time * 0.05;
      float noise = texture2D(noiseTexture, noiseCoord).r;

      float density = fogDensity * heightFactor * noise * stepSize;

      // Light scattering
      vec3 lightDir = normalize(lightPosition - samplePos);
      float lightDist = length(lightPosition - samplePos);
      float scatter = max(dot(rayDir, lightDir), 0.0);
      scatter = pow(scatter, 4.0);

      vec3 lightContrib = lightColor * lightIntensity * scatter / (lightDist * lightDist);

      // Accumulate fog
      vec3 fogContrib = (fogColor + lightContrib) * density;
      accumFog += fogContrib * (1.0 - accumDensity);
      accumDensity += density * (1.0 - accumDensity);
    }

    return accumFog;
  }

  void main() {
    vec3 rayDir = normalize(vViewDir);

    // Simplified ray marching for performance
    vec3 fog = rayMarch(vWorldPos, rayDir, 50.0, 16);

    // Distance fog
    float dist = length(vViewDir);
    float distFog = 1.0 - exp(-fogDensity * dist * 0.01);

    vec3 finalColor = fog + fogColor * distFog;
    float alpha = min(distFog + length(fog), 1.0);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// =============================================================================
// STADIUM LIGHTING SHADERS
// =============================================================================

export const stadiumLightVertex = `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const stadiumLightFragment = `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  uniform vec3 cameraPosition;
  uniform float time;

  // Stadium lights configuration
  uniform vec3 stadiumLights[4];
  uniform vec3 lightColors[4];
  uniform float lightIntensities[4];
  uniform bool flickerEnabled;

  // Material properties
  uniform vec3 baseColor;
  uniform float metalness;
  uniform float roughness;
  uniform sampler2D albedoMap;
  uniform sampler2D normalMap;
  uniform sampler2D roughnessMap;
  uniform sampler2D metalnessMap;

  // PBR lighting calculation
  vec3 calculatePBR(vec3 normal, vec3 viewDir, vec3 lightDir, vec3 lightColor, float intensity) {
    vec3 halfDir = normalize(lightDir + viewDir);

    float NdotL = max(dot(normal, lightDir), 0.0);
    float NdotV = max(dot(normal, viewDir), 0.0);
    float NdotH = max(dot(normal, halfDir), 0.0);
    float VdotH = max(dot(viewDir, halfDir), 0.0);

    // Fresnel
    vec3 F0 = mix(vec3(0.04), baseColor, metalness);
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - VdotH, 5.0);

    // Distribution
    float alpha = roughness * roughness;
    float alpha2 = alpha * alpha;
    float denom = NdotH * NdotH * (alpha2 - 1.0) + 1.0;
    float D = alpha2 / (3.14159265 * denom * denom);

    // Geometry
    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
    float G1L = NdotL / (NdotL * (1.0 - k) + k);
    float G1V = NdotV / (NdotV * (1.0 - k) + k);
    float G = G1L * G1V;

    // BRDF
    vec3 numerator = D * G * F;
    float denominator = 4.0 * NdotV * NdotL + 0.001;
    vec3 specular = numerator / denominator;

    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metalness;

    return (kD * baseColor / 3.14159265 + specular) * lightColor * intensity * NdotL;
  }

  void main() {
    // Sample textures
    vec3 albedo = texture2D(albedoMap, vUv).rgb;
    vec3 normal = vNormal; // Could be modified by normal map
    float rough = texture2D(roughnessMap, vUv).r;
    float metal = texture2D(metalnessMap, vUv).r;

    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    // Accumulate lighting from all stadium lights
    vec3 lighting = vec3(0.0);

    for (int i = 0; i < 4; i++) {
      vec3 lightDir = normalize(stadiumLights[i] - vWorldPos);
      float distance = length(stadiumLights[i] - vWorldPos);
      float attenuation = 1.0 / (1.0 + 0.09 * distance + 0.032 * distance * distance);

      // Flicker effect for realism
      float flicker = 1.0;
      if (flickerEnabled) {
        flicker = 0.95 + 0.05 * sin(time * 20.0 + float(i) * 1.571);
      }

      vec3 lightContrib = calculatePBR(
        normal,
        viewDir,
        lightDir,
        lightColors[i],
        lightIntensities[i] * attenuation * flicker
      );

      lighting += lightContrib;
    }

    // Ambient lighting
    vec3 ambient = baseColor * albedo * 0.1;

    // Rim lighting for dramatic effect
    float rim = 1.0 - max(dot(normal, viewDir), 0.0);
    rim = pow(rim, 2.0);
    vec3 rimLight = vec3(1.0, 0.5, 0.0) * rim * 0.5; // Orange rim light

    vec3 finalColor = ambient + lighting + rimLight;

    // Tone mapping
    finalColor = finalColor / (finalColor + vec3(1.0));
    finalColor = pow(finalColor, vec3(1.0 / 2.2));

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// =============================================================================
// SCREEN SPACE EFFECTS
// =============================================================================

export const motionBlurFragment = `
  uniform sampler2D tDiffuse;
  uniform sampler2D tVelocity;
  uniform float velocityScale;
  uniform float maxSamples;
  varying vec2 vUv;

  void main() {
    vec2 velocity = texture2D(tVelocity, vUv).xy * velocityScale;
    float speed = length(velocity);

    int samples = min(int(speed * maxSamples), int(maxSamples));

    vec4 color = texture2D(tDiffuse, vUv);

    for (int i = 1; i < 16; i++) {
      if (i >= samples) break;

      float t = float(i) / float(samples);
      vec2 offset = velocity * t;

      color += texture2D(tDiffuse, vUv + offset);
    }

    color /= float(samples + 1);

    gl_FragColor = color;
  }
`;

// =============================================================================
// EXPORT SHADER LIBRARY
// =============================================================================

export const ChampionshipShaders = {
  particle: {
    vertex: championshipParticleVertex,
    fragment: championshipParticleFragment
  },
  heatMap: {
    vertex: heatMapVertex,
    fragment: heatMapFragment
  },
  volumetricFog: {
    vertex: volumetricFogVertex,
    fragment: volumetricFogFragment
  },
  stadiumLight: {
    vertex: stadiumLightVertex,
    fragment: stadiumLightFragment
  },
  postProcessing: {
    motionBlur: motionBlurFragment
  }
};

export default ChampionshipShaders;