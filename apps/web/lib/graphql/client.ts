/**
 * Blaze Intelligence Apollo GraphQL Client
 * Optimized for real-time sports data with subscriptions
 */

import {
  ApolloClient,
  InMemoryCache,
  split,
  from,
  HttpLink,
  ApolloLink,
  DefaultOptions
} from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient as createWSClient } from 'graphql-ws';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { useSportsStore } from '../stores/sportsStore';

// Configuration
const isDev = process.env.NODE_ENV === 'development';
const HTTP_URI = isDev
  ? 'http://localhost:3000/api/graphql'
  : 'https://blazesportsintel.com/api/graphql';
const WS_URI = isDev
  ? 'ws://localhost:3000/api/graphql'
  : 'wss://blazesportsintel.com/api/graphql';

// Create WebSocket client with reconnection logic
const wsClient = createWSClient({
  url: WS_URI,
  connectionParams: () => {
    const tenant = useSportsStore.getState().tenant;
    return {
      authToken: localStorage.getItem('authToken'),
      tenantId: tenant?.id,
      sports: ['MLB', 'NFL', 'NBA', 'NCAA']
    };
  },
  on: {
    connected: () => {
      console.log('GraphQL WebSocket connected');
      useSportsStore.getState().setWsConnected(true);
    },
    closed: () => {
      console.log('GraphQL WebSocket closed');
      useSportsStore.getState().setWsConnected(false);
    },
    error: (error) => {
      console.error('GraphQL WebSocket error:', error);
    }
  },
  shouldRetry: (closeEvent) => {
    // Retry on abnormal closures
    return closeEvent.code !== 1000;
  },
  retryAttempts: 5,
  retryWait: (attempt) => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }
});

// Create WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(wsClient);

// HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: HTTP_URI,
  credentials: 'include'
});

// Auth link to add authentication headers
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('authToken');
  const tenant = useSportsStore.getState().tenant;

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'x-tenant-id': tenant?.id || '',
      'x-client-type': 'web-3d-dashboard',
      'x-performance-mode': useSportsStore.getState().qualityMode
    }
  };
});

// Error link for handling errors
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      );

      // Handle specific error types
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Redirect to login
        window.location.href = '/login';
      } else if (extensions?.code === 'RATE_LIMITED') {
        // Reduce quality mode
        const currentMode = useSportsStore.getState().qualityMode;
        if (currentMode === 'ultra') {
          useSportsStore.getState().setQualityMode('high');
        } else if (currentMode === 'high') {
          useSportsStore.getState().setQualityMode('medium');
        }
      }
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);

    // Handle network errors
    if ('statusCode' in networkError) {
      switch (networkError.statusCode) {
        case 429:
          // Rate limited - reduce update frequency
          console.warn('Rate limited, reducing update frequency');
          break;
        case 503:
          // Service unavailable - fall back to cached data
          console.warn('Service unavailable, using cached data');
          break;
      }
    }
  }
});

// Performance monitoring link
const performanceLink = new ApolloLink((operation, forward) => {
  const startTime = Date.now();

  return forward(operation).map(result => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Update performance metrics
    useSportsStore.getState().updatePerformanceMetrics({
      latency: duration
    });

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow GraphQL operation: ${operation.operationName} took ${duration}ms`);
    }

    return result;
  });
});

// Split link for HTTP and WebSocket
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([authLink, errorLink, performanceLink, httpLink])
);

// Cache configuration with field policies
const cache = new InMemoryCache({
  typePolicies: {
    Player: {
      keyFields: ['id'],
      fields: {
        position3D: {
          merge: true
        },
        biometrics: {
          merge: true
        },
        stats: {
          merge: true
        }
      }
    },
    GameEvent: {
      keyFields: ['id'],
      fields: {
        timestamp: {
          merge: false
        }
      }
    },
    Trajectory: {
      keyFields: ['id'],
      fields: {
        points: {
          merge: false
        }
      }
    },
    HeatZone: {
      keyFields: ['id'],
      fields: {
        playerActivity: {
          merge: false
        }
      }
    },
    GameState: {
      fields: {
        players: {
          merge: (existing = [], incoming) => {
            // Merge players by id, keeping most recent
            const merged = new Map();

            existing.forEach(player => {
              merged.set(player.__ref, player);
            });

            incoming.forEach(player => {
              merged.set(player.__ref, player);
            });

            return Array.from(merged.values());
          }
        },
        events: {
          merge: (existing = [], incoming) => {
            // Keep only recent events to prevent memory bloat
            const allEvents = [...existing, ...incoming];
            return allEvents.slice(-1000); // Keep last 1000 events
          }
        },
        trajectories: {
          merge: (existing = [], incoming) => {
            // Keep only recent trajectories
            const allTrajectories = [...existing, ...incoming];
            return allTrajectories.slice(-500); // Keep last 500 trajectories
          }
        }
      }
    }
  }
});

// Default options for better performance
const defaultOptions: DefaultOptions = {
  watchQuery: {
    fetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
    pollInterval: 0, // Use subscriptions instead
  },
  query: {
    fetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  },
  mutate: {
    errorPolicy: 'all',
  }
};

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache,
  defaultOptions,
  connectToDevTools: isDev,
  assumeImmutableResults: true,
});

// Utility functions
export function subscribeToSport(sport: 'MLB' | 'NFL' | 'NBA' | 'NCAA', team: string) {
  return apolloClient.subscribe({
    query: require('./subscriptions').GAME_STATE_UPDATED,
    variables: { sport, team }
  });
}

export function subscribeToPlayerUpdates(sport: 'MLB' | 'NFL' | 'NBA' | 'NCAA', team: string) {
  return apolloClient.subscribe({
    query: require('./subscriptions').PLAYERS_UPDATED,
    variables: { sport, team }
  });
}

export function subscribeToEvents(sport: 'MLB' | 'NFL' | 'NBA' | 'NCAA', team: string) {
  return apolloClient.subscribe({
    query: require('./subscriptions').GAME_EVENT_ADDED,
    variables: { sport, team }
  });
}

// Cleanup function
export function cleanupSubscriptions() {
  wsClient.dispose();
}