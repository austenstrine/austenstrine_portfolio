import { cache } from 'react';
import { getCart } from './checkout-api';

/** Request-scoped SSR dedupe with PeM layout cart probe (PEM-373/372). */
export const getCartCached = cache(() => getCart());
