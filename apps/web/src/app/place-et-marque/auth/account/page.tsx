import { listMyVendors } from '../../../../lib/catalog-api';
import { AccountHubClient } from './AccountHubClient';

export default async function AccountPage() {
	const vendors = await listMyVendors().catch(() => []);

	return (
		<AccountHubClient vendors={vendors} />
	);
}
