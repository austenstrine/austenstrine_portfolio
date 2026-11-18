import { RequireAccess } from '../../../../components/auth/RequireAccess';
import { listMyVendors } from '../../../../lib/catalog-api';
import { AccountHubClient } from './AccountHubClient';

export default async function AccountPage() {
	const vendors = await listMyVendors().catch(() => []);

	return (
		<RequireAccess reasonKey="account">
			<AccountHubClient vendors={vendors} />
		</RequireAccess>
	);
}
