/**
 * Blaze Intelligence GraphQL Mutations
 * Mutations for updating 3D sports data
 */

import { gql } from '@apollo/client';

// Player mutations
export const UPDATE_PLAYER = gql`
  mutation UpdatePlayer($input: PlayerUpdateInput!) {
    updatePlayer(input: $input) {
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
  }
`;

export const UPDATE_PLAYERS = gql`
  mutation UpdatePlayers($inputs: [PlayerUpdateInput!]!) {
    updatePlayers(inputs: $inputs) {
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
  }
`;

// Event mutations
export const ADD_GAME_EVENT = gql`
  mutation AddGameEvent($input: GameEventInput!) {
    addGameEvent(input: $input) {
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
  }
`;

// Trajectory mutations
export const ADD_TRAJECTORY = gql`
  mutation AddTrajectory($input: TrajectoryInput!) {
    addTrajectory(input: $input) {
      id
      type
      points
      velocities
      spin
      outcome
      probability
      timestamp
    }
  }
`;

// Heat zone mutations
export const UPDATE_HEAT_ZONES = gql`
  mutation UpdateHeatZones($inputs: [HeatZoneInput!]!) {
    updateHeatZones(inputs: $inputs) {
      id
      position
      radius
      intensity
      color
      label
      type
      playerActivity
    }
  }
`;

// Tenant mutations
export const CREATE_TENANT = gql`
  mutation CreateTenant($name: String!, $theme: JSON!) {
    createTenant(name: $name, theme: $theme) {
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

export const UPDATE_TENANT = gql`
  mutation UpdateTenant($id: ID!, $name: String, $theme: JSON) {
    updateTenant(id: $id, name: $name, theme: $theme) {
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

// Performance mutations
export const UPDATE_PERFORMANCE_METRICS = gql`
  mutation UpdatePerformanceMetrics($metrics: JSON!) {
    updatePerformanceMetrics(metrics: $metrics) {
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