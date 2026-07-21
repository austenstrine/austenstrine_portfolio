import { Injectable } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';

@Injectable()
export class OpenSearchService {
  readonly client: Client;

  constructor() {
    this.client = new Client({
      node: process.env.OPENSEARCH_NODE ?? 'http://localhost:9200',
    });
  }

  async ping(): Promise<boolean> {
    const response = await this.client.ping();
    return response.statusCode === 200;
  }
}
