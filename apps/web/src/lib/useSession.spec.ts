import { finishSignedInNavigation } from './useSession';

describe('finishSignedInNavigation (PEM-516)', () => {
	const user = {
		id: 'user_1',
		email: 'buyer@example.com',
		hasPassword: true,
	};

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('hard-assigns destination — cookies + shop SSR remount are authoritative', () => {
		const assign = jest.fn();
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: {
				location: {
					assign,
				},
			},
		});

		const adopt = jest.fn();
		finishSignedInNavigation(adopt, user, '/place-et-marque/cart');

		expect(assign).toHaveBeenCalledTimes(1);
		expect(assign).toHaveBeenCalledWith('/place-et-marque/cart');
		// Soft adopt alone left guest SessionProvider mounted (PEM-505/514).
		// Hard assign is the contract; adopt must not be required for success.
		expect(adopt).not.toHaveBeenCalled();
	});

	it('fails closed if only soft adopt ran (no location.assign)', () => {
		const assign = jest.fn();
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: {
				location: {
					assign,
				},
			},
		});

		finishSignedInNavigation(undefined, user, '/place-et-marque');
		expect(assign).toHaveBeenCalledWith('/place-et-marque');
	});
});
