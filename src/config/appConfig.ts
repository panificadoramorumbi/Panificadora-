/**
 * Configuration and URL helpers for Panificadora Morumbi
 *
 * ais-dev-*: Private developer sandbox URL (IAM restricted to creator)
 * ais-pre-*: Public production / preview URL (Accessible by any customer / reseller on any phone)
 */

export function getPublicAppUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin;
  }
  return 'https://ais-pre-artxy4o6olax5pgvyeox7j-115527661338.us-east1.run.app';
}

export function getPublicHostname(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('ais-dev-')) {
      return host.replace('ais-dev-', 'ais-pre-');
    }
    return host;
  }
  return 'ais-pre-artxy4o6olax5pgvyeox7j-115527661338.us-east1.run.app';
}

export function getDevHostname(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return 'ais-dev-artxy4o6olax5pgvyeox7j-115527661338.us-east1.run.app';
}
