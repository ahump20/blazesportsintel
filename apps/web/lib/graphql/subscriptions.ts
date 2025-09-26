/**
 * Blaze Intelligence GraphQL Subscriptions
 * Real-time subscriptions for live sports data
 */

import { gql } from '@apollo/client';

// Import fragments
const PLAYER_FRAGMENT = gql`
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
      primary
      secondary
      tertiary
      efficiency
      trend
      customMetrics
    }
    biometrics {
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
    isActive
    timestamp
  }
`;

const GAME_EVENT_FRAGMENT = gql`
  fragment GameEventFragment on GameEvent {
    id
    type
    position
    players
    outcome
    impact
    timestamp
    particles {
      type
      count
      colors
      lifetime
      velocity
      size
      physics
    }
    metadata
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

const FIELD_FRAGMENT = gql`
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

const GAME_STATE_FRAGMENT = gql`
  ${PLAYER_FRAGMENT}
  ${FIELD_FRAGMENT}
  fragment GameStateFragment on GameState {
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
`;

// Player subscriptions
export const PLAYER_UPDATED = gql`
  ${PLAYER_FRAGMENT}
  subscription PlayerUpdated($sport: Sport!, $team: String) {
    playerUpdated(sport: $sport, team: $team) {
      ...PlayerFragment
    }
  }
`;

export const PLAYERS_UPDATED = gql`
  ${PLAYER_FRAGMENT}
  subscription PlayersUpdated($sport: Sport!, $team: String) {
    playersUpdated(sport: $sport, team: $team) {
      ...PlayerFragment
    }
  }
`;

// Game event subscriptions
export const GAME_EVENT_ADDED = gql`
  ${GAME_EVENT_FRAGMENT}
  subscription GameEventAdded($sport: Sport!, $team: String) {
    gameEventAdded(sport: $sport, team: $team) {
      ...GameEventFragment
    }
  }
`;

export const TRAJECTORY_ADDED = gql`
  ${TRAJECTORY_FRAGMENT}
  subscription TrajectoryAdded($sport: Sport!, $team: String) {
    trajectoryAdded(sport: $sport, team: $team) {
      ...TrajectoryFragment
    }
  }
`;

// Field subscriptions
export const HEAT_ZONE_UPDATED = gql`
  ${HEAT_ZONE_FRAGMENT}
  subscription HeatZoneUpdated($sport: Sport!, $team: String) {
    heatZoneUpdated(sport: $sport, team: $team) {
      ...HeatZoneFragment
    }
  }
`;

export const FIELD_UPDATED = gql`
  ${FIELD_FRAGMENT}
  subscription FieldUpdated($sport: Sport!, $team: String) {
    fieldUpdated(sport: $sport, team: $team) {
      ...FieldFragment
    }
  }
`;

// Game state subscription
export const GAME_STATE_UPDATED = gql`
  ${GAME_STATE_FRAGMENT}
  subscription GameStateUpdated($sport: Sport!, $team: String!) {
    gameStateUpdated(sport: $sport, team: $team) {
      ...GameStateFragment
    }
  }
`;

// Performance monitoring
export const PERFORMANCE_METRICS_UPDATED = gql`
  subscription PerformanceMetricsUpdated {
    performanceMetricsUpdated {
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

// Connection status
export const CONNECTION_STATUS_CHANGED = gql`
  subscription ConnectionStatusChanged {
    connectionStatusChanged
  }
`;