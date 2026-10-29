import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/site';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: '*',
			allow: '/',
			disallow: ['/auth/', '/place-et-marque/manage', '/place-et-marque/cart'],
		},
		sitemap: `${SITE_URL}/sitemap.xml`,
	};
}
