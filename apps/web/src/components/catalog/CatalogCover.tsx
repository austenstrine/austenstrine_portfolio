'use client';

import type { ReactNode } from 'react';
import { CdnImg } from '../CdnImg';

type CatalogCoverProps = {
	src?: string | null;
	alt: string;
	fallback: ReactNode;
	className?: string;
	width?: number;
	height?: number;
};

export function CatalogCover({
	src,
	alt,
	fallback,
	className = 'h-full w-full object-cover',
	width = 900,
	height = 540,
}: CatalogCoverProps) {
	if(!src) {
		return <>{fallback}</>;
	}

	return (
		<CdnImg
			src={src}
			alt={alt}
			className={className}
			cdn={{ w: width, h: height, fit: 'cover', q: 72 }}
		/>
	);
}
