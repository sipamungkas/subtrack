import { describe, it, expect } from 'vitest';
import { getCurrencySymbol, formatCurrency } from '../currency';

describe('getCurrencySymbol', () => {
  it('should return correct symbol for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('should return correct symbol for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('should return correct symbol for GBP', () => {
    expect(getCurrencySymbol('GBP')).toBe('£');
  });

  it('should return correct symbol for IDR', () => {
    expect(getCurrencySymbol('IDR')).toBe('Rp');
  });

  it('should return correct symbol for AUD', () => {
    expect(getCurrencySymbol('AUD')).toBe('A$');
  });

  it('should return correct symbol for SGD', () => {
    expect(getCurrencySymbol('SGD')).toBe('S$');
  });

  it('should return currency code if symbol not found', () => {
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });
});

describe('formatCurrency', () => {
  it('should format USD amount', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('should format EUR amount', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
  });

  it('should format IDR amount', () => {
    expect(formatCurrency(50000, 'IDR')).toBe('Rp50,000.00');
  });

  it('should format with 0 decimals when specified', () => {
    expect(formatCurrency(1234.56, 'USD', { minimumFractionDigits: 0 })).toBe('$1,235');
  });
});
