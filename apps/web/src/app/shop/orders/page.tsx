import { Suspense } from 'react';
import { OrdersClient } from './OrdersClient';

export default function OrdersPage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading orders…
				</p>
			}
		>
			<OrdersClient />
		</Suspense>
	);
}
