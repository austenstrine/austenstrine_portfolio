'use client';

import { useState, type ImgHTMLAttributes } from 'react';
import { CDN_BASE_URL, cdnUrl, type CdnImageOptions } from '../lib/cdn';

type CdnImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
	src: string;
	cdn?: CdnImageOptions;
};

export function CdnImg({ src, cdn, onError, ...props }: CdnImgProps) {
	const [failed, setFailed] = useState(false);
	const resolved = !failed && CDN_BASE_URL ? cdnUrl(src, cdn) : src;

	return (
		<img
			{...props}
			src={resolved}
			onError={(event) => {
				if(!failed && resolved !== src) {
					setFailed(true);
					return;
				}
				onError?.(event);
			}}
		/>
	);
}
