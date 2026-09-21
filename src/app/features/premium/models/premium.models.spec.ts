import { installmentPremium } from './premium.models';

describe('installmentPremium', () => {
  it('derives each installment from the annual policy premium', () => {
    expect(installmentPremium(24000, 'Monthly')).toBe(2000);
    expect(installmentPremium(24000, 'Quarterly')).toBe(6000);
    expect(installmentPremium(24000, 'HalfYearly')).toBe(12000);
    expect(installmentPremium(24000, 'Annual')).toBe(24000);
  });

  it('rounds installment amounts to two decimal places', () => {
    expect(installmentPremium(25000, 'Monthly')).toBe(2083.33);
  });
});