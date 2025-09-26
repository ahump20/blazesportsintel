/**
 * Blaze Intelligence GraphQL Queries
 * Optimized queries for 3D sports data visualization
 */

import { gql } from '@apollo/client';

// Player fragments
const PLAYER_STATS_FRAGMENT = gql`
  fragment PlayerStatsFragment on PlayerStats {
    primary
    secondary
    tertiary
    efficiency
    trend
    customMetrics
  }
`;

const BIOMETRIC_DATA_FRAGMENT = gql`
  fragment BiometricDataFragment on BiometricData {
    skeleton {
      joint
      position
      rotation
      confidence
    }
    velocity
    fatigue
    stressLevel
    microExpressions {
      type
      intensity
      duration
      timestamp
    }
    heartRate
    muscleActivation
  }
`;

const PLAYER_FRAGMENT = gql`
  ${PLAYER_STATS_FRAGMENT}
  ${BIOMETRIC_DATA_FRAGMENT}
  fragment PlayerFragment on Player {
    id
    name
    team
    sport
    position
    jerseyNumber
    position3D
    rotation
    velocity
    acceleration
    stats {
      ...PlayerStatsFragment
    }
    biometrics {
      ...BiometricDataFragment
    }
    isActive
    timestamp
  }
`;

// Event fragments
const PARTICLE_CONFIG_FRAGMENT = gql`
  fragment ParticleConfigFragment on ParticleConfig {
    type
    count
    colors
    lifetime
    velocity
    size
    physics
  }
`;

const GAME_EVENT_FRAGMENT = gql`
  ${PARTICLE_CONFIG_FRAGMENT}
  fragment GameEventFragment on GameEvent {
    id
    type
    position
    players
    outcome
    impact
    timestamp
    particles {
      ...ParticleConfigFragment
    }
    metadata
  }
`;

// Field fragments
const HEAT_ZONE_FRAGMENT = gql`
  fragment HeatZoneFragment on HeatZone {
    id
    position
    radius
    intensity
    color
    label
    type
    playerActivity
  }
`;

const TRAJECTORY_FRAGMENT = gql`
  fragment TrajectoryFragment on Trajectory {
    id
    type
    points
    velocities
    spin
    outcome
    probability
    timestamp
  }
`;

const FIELD_FRAGMENT = gql`
  ${HEAT_ZONE_FRAGMENT}
  ${TRAJECTORY_FRAGMENT}
  ${GAME_EVENT_FRAGMENT}
  fragment FieldFragment on Field {
    sport
    dimensions {
      width
      length
      height
      boundaries
      importantPoints
    }
    zones {
      ...HeatZoneFragment
    }
    trajectories {
      ...TrajectoryFragment
    }
    events {
      ...GameEventFragment
    }
    weather {
      temperature
      humidity
      windSpeed
      windDirection
      precipitation
      visibility
    }
  }
`;

// Main queries
export const GET_GAME_STATE = gql`
  ${PLAYER_FRAGMENT}
  ${FIELD_FRAGMENT}
  query GetGameState($sport: Sport!, $team: String!) {
    gameState(sport: $sport, team: $team) {
      id
      sport
      homeTeam
      awayTeam
      homeScore
      awayScore
      period
      timeRemaining
      isLive
      stadium
      weather {
        temperature
        humidity
        windSpeed
        windDirection
        precipitation
        visibility
      }
      players {
        ...PlayerFragment
      }
      field {
        ...FieldFragment
      }
      events {
        ...GameEventFragment
      }
      lastUpdate
    }
  }
`;

export const GET_PLAYERS = gql`
  ${PLAYER_FRAGMENT}
  query GetPlayers($sport: Sport!, $team: String, $active: Boolean) {
    players(sport: $sport, team: $team, active: $active) {
      ...PlayerFragment
    }
  }
`;

export const GET_PLAYER = gql`
  ${PLAYER_FRAGMENT}
  query GetPlayer($id: ID!) {
    player(id: $id) {
      ...PlayerFragment
    }
  }
`;

export const GET_PLAYER_STATS = gql`
  ${PLAYER_STATS_FRAGMENT}
  query GetPlayerStats($id: ID!, $timeRange: [DateTime!]) {
    playerStats(id: $id, timeRange: $timeRange) {
      ...PlayerStatsFragment
    }
  }
`;

export const GET_FIELD = gql`
  ${FIELD_FRAGMENT}
  query GetField($sport: Sport!, $team: String!) {
    field(sport: $sport, team: $team) {
      ...FieldFragment
    }
  }
`;

export const GET_HEAT_ZONES = gql`
  ${HEAT_ZONE_FRAGMENT}
  query GetHeatZones($sport: Sport!, $team: String!, $timeRange: [DateTime!]) {
    heatZones(sport: $sport, team: $team, timeRange: $timeRange) {
      ...HeatZoneFragment
    }
  }
`;

export const GET_TRAJECTORIES = gql`
  ${TRAJECTORY_FRAGMENT}
  query GetTrajectories($sport: Sport!, $team: String!, $limit: Int) {
    trajectories(sport: $sport, team: $team, limit: $limit) {
      ...TrajectoryFragment
    }
  }
`;

export const GET_GAME_EVENTS = gql`
  ${GAME_EVENT_FRAGMENT}
  query GetGameEvents($sport: Sport!, $team: String!, $timeRange: [DateTime!]) {
    gameEvents(sport: $sport, team: $team, timeRange: $timeRange) {
      ...GameEventFragment
    }
  }
`;

export const GET_ANALYTICS = gql`
  query GetAnalytics($filter: AnalyticsFilter!) {
    analytics(filter: $filter) {
      id
      type
      data {
        position
        value
        label
        color
        size
        connections
        metadata
      }
      axes {
        dimension
        label
        min
        max
        ticks
        unit
      }
      legends {
        label
        color
        shape
        value
      }
      interactions {
        hover
        click
        drag
        zoom
        rotate
      }
    }
  }
`;

export const GET_PERFORMANCE_METRICS = gql`
  query GetPerformanceMetrics {
    performanceMetrics {
      fps
      frameTime
      drawCalls
      triangles
      points
      memory
      latency
    }
  }
`;

export const GET_TENANT = gql`
  query GetTenant($id: ID!) {
    tenant(id: $id) {
      id
      name
      theme {
        primaryColor
        secondaryColor
        accentColor
        fontFamily
        logo
        watermark
      }
      sports
      features
      customizations
    }
  }
`;

export const GET_TENANTS = gql`
  query GetTenants {
    tenants {
      id
      name
      theme {
        primaryColor
        secondaryColor
        accentColor
        fontFamily
        logo
        watermark
      }
      sports
      features
      customizations
    }
  }
`;

export const GET_CONNECTION_STATUS = gql`
  query GetConnectionStatus {
    connectionStatus
  }
`;