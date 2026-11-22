import { describe, expect, it } from 'vitest';
import { FLUE_GAS_CARBONATES, flueGasCode, flueGasComplete, flueGasSelection } from './flueGas';

// Carbonates: IR (EU) 2025/2547 Annex II, Section G, Table 3 (p. 63); Method A per B.9.1.1 (p. 49).
describe('flue gas selection', () => {
  it('lists the 9 carbonates of Table 3, soda ash and limestone first', () => {
    expect(FLUE_GAS_CARBONATES.map((c) => c.key)).toEqual([
      'SODA_ASH', 'LIMESTONE', 'MGCO3', 'BACO3', 'LI2CO3', 'K2CO3', 'SRCO3', 'NAHCO3', 'FECO3',
    ]);
  });

  it('reads the older codes exactly as before (soda ash / limestone from the code only)', () => {
    expect(flueGasSelection('SODA_ASH').ticked).toEqual(['SODA_ASH']);
    expect(flueGasSelection('LIMESTONE').ticked).toEqual(['LIMESTONE']);
    expect(flueGasSelection('SODA_ASH_AND_LIMESTONE').ticked).toEqual(['SODA_ASH', 'LIMESTONE']);
    expect(flueGasSelection('soda-ash').ticked).toEqual(['SODA_ASH']);
    expect(flueGasSelection('nothing')).toEqual({ ticked: [], nothing: true });
    // a stray quantity does not tick a box under an older code
    expect(flueGasSelection('SODA_ASH', { LIMESTONE: '3' }).ticked).toEqual(['SODA_ASH']);
  });

  it('reads CARBONATES from the quantities', () => {
    expect(flueGasSelection('CARBONATES', { SODA_ASH: '2', MGCO3: '1', FECO3: '' }).ticked).toEqual(['SODA_ASH', 'MGCO3']);
  });

  it('saves the older codes when only soda ash and/or limestone are ticked', () => {
    expect(flueGasCode({ ticked: ['SODA_ASH'], nothing: false })).toBe('SODA_ASH');
    expect(flueGasCode({ ticked: ['LIMESTONE'], nothing: false })).toBe('LIMESTONE');
    expect(flueGasCode({ ticked: ['LIMESTONE', 'SODA_ASH'], nothing: false })).toBe('SODA_ASH_AND_LIMESTONE');
    expect(flueGasCode({ ticked: [], nothing: true })).toBe('NOTHING');
    expect(flueGasCode({ ticked: [], nothing: false })).toBe('');
  });

  it('saves CARBONATES as soon as another carbonate is ticked', () => {
    expect(flueGasCode({ ticked: ['MGCO3'], nothing: false })).toBe('CARBONATES');
    expect(flueGasCode({ ticked: ['SODA_ASH', 'NAHCO3'], nothing: false })).toBe('CARBONATES');
  });

  it('needs a positive quantity for every ticked carbonate', () => {
    expect(flueGasComplete({ ticked: [], nothing: true }, {})).toBe(true);
    expect(flueGasComplete({ ticked: [], nothing: false }, {})).toBe(false);
    expect(flueGasComplete({ ticked: ['SODA_ASH', 'K2CO3'], nothing: false }, { SODA_ASH: '2', K2CO3: '0,5' })).toBe(true);
    expect(flueGasComplete({ ticked: ['SODA_ASH', 'K2CO3'], nothing: false }, { SODA_ASH: '2' })).toBe(false);
    expect(flueGasComplete({ ticked: ['SRCO3'], nothing: false }, { SRCO3: '0' })).toBe(false);
  });
});
