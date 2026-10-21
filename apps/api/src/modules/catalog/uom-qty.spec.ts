import {
	compoundToDecimal,
	decimalToCompound,
	formatQty,
	resolveQty,
} from './uom-qty';

describe('uom-qty', () => {
	it('converts feet and inches including 32nds', () => {
		expect(compoundToDecimal('FT', { major: '10', minor: '6' })).toBe('10.5');
		expect(compoundToDecimal('FT', { major: '0', minor: '0', fraction: '1' })).toBe(
			'0.00260417',
		);
		expect(compoundToDecimal('FT', { major: '1', minor: '0', fraction: '16' })).toBe(
			'1.04166667',
		);
	});

	it('converts pounds/ounces and kg/grams', () => {
		expect(compoundToDecimal('LB', { major: '2', minor: '8' })).toBe('2.5');
		expect(compoundToDecimal('KG', { major: '1', minor: '500' })).toBe('1.5');
	});

	it('round-trips decimal feet to compound parts', () => {
		expect(decimalToCompound('FT', '10.5')).toEqual({
			major: '10',
			minor: '6',
			fraction: '0',
		});
	});

	it('resolves compound over a plain decimal', () => {
		expect(
			resolveQty('FT', '99', { major: '1', minor: '6' }),
		).toBe('1.5');
		expect(resolveQty('EA', '3')).toBe('3');
	});

	it('formats qty for display', () => {
		expect(formatQty('10.5', 'FT')).toBe('10 feet 6 inches');
		expect(formatQty('2.5', 'LB')).toBe('2 pounds 8 ounces');
		expect(formatQty('4', 'EA')).toBe('4 ea');
	});
});
