import { apiTimeoutSignal } from './timed-fetch';

export type Project = {
	id: string;
	title: string;
	slug: string;
	summary: string;
	tags: string[];
	featured: boolean;
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export async function getProjects(): Promise<Project[]> {
	try {
		const response = await fetch(`${API_BASE_URL}/projects`, {
			cache: 'no-store',
			signal: apiTimeoutSignal(),
		});
		if(!response.ok) {
			return [];
		}
		return (await response.json()) as Project[];
	}
	catch {
		return [];
	}
}
