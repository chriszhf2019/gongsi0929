import { describe, it, expect } from 'vitest';
import { listKnownFactories, findFactoryForCompany } from '../server-sar';

// ---------------------------------------------------------------------------
// listKnownFactories
// ---------------------------------------------------------------------------

describe('listKnownFactories', () => {
  it('should return all known factories', () => {
    const factories = listKnownFactories();

    expect(factories.length).toBeGreaterThan(0);
    expect(factories[0]).toHaveProperty('key');
    expect(factories[0]).toHaveProperty('name');
    expect(factories[0]).toHaveProperty('lat');
    expect(factories[0]).toHaveProperty('lon');
  });

  it('should include BYD factory', () => {
    const factories = listKnownFactories();
    const bydFactory = factories.find((f) => f.key.includes('比亚迪'));

    expect(bydFactory).toBeDefined();
    expect(bydFactory!.lat).toBeCloseTo(22.7, 1);
    expect(bydFactory!.lon).toBeCloseTo(114.3, 1);
  });

  it('should include CATL factory', () => {
    const factories = listKnownFactories();
    const catlFactory = factories.find((f) => f.key.includes('宁德时代'));

    expect(catlFactory).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// findFactoryForCompany
// ---------------------------------------------------------------------------

describe('findFactoryForCompany', () => {
  it('should find factory for BYD (Chinese)', () => {
    const factoryKey = findFactoryForCompany('比亚迪');
    expect(factoryKey).toBe('比亚迪坪山工厂');
  });

  it('should find factory for BYD (English)', () => {
    const factoryKey = findFactoryForCompany('BYD Company');
    expect(factoryKey).toBe('比亚迪坪山工厂');
  });

  it('should find factory for CATL (Chinese)', () => {
    const factoryKey = findFactoryForCompany('宁德时代');
    expect(factoryKey).toBe('宁德时代湖西基地');
  });

  it('should find factory for CATL (English)', () => {
    const factoryKey = findFactoryForCompany('CATL');
    expect(factoryKey).toBe('宁德时代湖西基地');
  });

  it('should return null for unknown company', () => {
    const factoryKey = findFactoryForCompany('Unknown Company');
    expect(factoryKey).toBeNull();
  });

  it('should be case insensitive', () => {
    expect(findFactoryForCompany('byd')).toBe('比亚迪坪山工厂');
    expect(findFactoryForCompany('catl')).toBe('宁德时代湖西基地');
  });
});
