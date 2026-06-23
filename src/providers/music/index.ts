import type { MusicProviderInterface } from '../../types/provider';
import { jiosaavnProvider } from './JioSaavnProvider';

const providers: Record<string, MusicProviderInterface> = {
  jiosaavn: jiosaavnProvider,
};

let activeProvider: MusicProviderInterface = jiosaavnProvider;

/**
 * Get the currently active music provider.
 */
export function getMusicProvider(): MusicProviderInterface {
  return activeProvider;
}

/**
 * Switch the active music provider by name.
 * @throws if the provider name is not registered.
 */
export function setMusicProvider(name: string): void {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown music provider: "${name}". Available: ${Object.keys(providers).join(', ')}`);
  }
  activeProvider = provider;
}

/**
 * Register a new music provider at runtime.
 */
export function registerMusicProvider(name: string, provider: MusicProviderInterface): void {
  providers[name] = provider;
}

/**
 * List all registered provider names.
 */
export function getRegisteredProviders(): string[] {
  return Object.keys(providers);
}
