import { Injectable } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';

@Injectable()
export class OpenSearchService {
	readonly client: Client;

	constructor() {
		const node = process.env.OPENSEARCH_NODE ?? 'https://localhost:9200';
		const username = process.env.OPENSEARCH_USERNAME ?? 'admin';
		const password = process.env.OPENSEARCH_PASSWORD;
		const rejectUnauthorized = process.env.OPENSEARCH_TLS_REJECT_UNAUTHORIZED === 'true';
		this.client = new Client({
			node,
			...(password ? { auth: { username, password } } : {}),
			ssl: { rejectUnauthorized },
		});
	}

	async ping(): Promise<boolean> {
		const response = await this.client.ping();
		return response.statusCode === 200;
	}
}
