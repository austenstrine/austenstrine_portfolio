import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
	const lastModified = new Date();

	return [
		{
			url: SITE_URL,
			lastModified,
			changeFrequency: 'weekly',
			priority: 1,
		},
		{
			url: `${SITE_URL}/cv.html`,
			lastModified,
			changeFrequency: 'weekly',
			priority: 0.9,
		},
		{
			url: `${SITE_URL}/place-et-marque`,
			lastModified,
			changeFrequency: 'weekly',
			priority: 0.8,
		},
		{
			url: `${SITE_URL}/place-et-marque/search`,
			lastModified,
			changeFrequency: 'weekly',
			priority: 0.7,
		},
		{
			url: `${SITE_URL}/place-et-marque/guide`,
			lastModified,
			changeFrequency: 'monthly',
			priority: 0.5,
		},
	];
}
