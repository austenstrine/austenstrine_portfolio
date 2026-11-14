'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeftIcon } from '../../components/icons/ArrowLeftIcon';
import { PrinterIcon } from '../../components/icons/PrinterIcon';
import { SITE_CV_PRINT_TITLE } from '../../lib/site';

export function CvToolbar() {
	const previousTitleRef = useRef(
		typeof document !== 'undefined'
			? document.title
			: SITE_CV_PRINT_TITLE,
	);

	// Button sets title before print(); Ctrl/Cmd+P relies on beforeprint.
	useEffect(() => {
		previousTitleRef.current = document.title;

		const onBeforePrint = () => {
			if(document.title !== SITE_CV_PRINT_TITLE) {
				previousTitleRef.current = document.title;
				document.title = SITE_CV_PRINT_TITLE;
			}
		};
		const onAfterPrint = () => {
			document.title = previousTitleRef.current;
		};

		window.addEventListener('beforeprint', onBeforePrint);
		window.addEventListener('afterprint', onAfterPrint);
		return () => {
			window.removeEventListener('beforeprint', onBeforePrint);
			window.removeEventListener('afterprint', onAfterPrint);
			if(document.title === SITE_CV_PRINT_TITLE) {
				document.title = previousTitleRef.current;
			}
		};
	}, []);

	return (
		<div className="screen-toolbar">
			<button
				className="back-btn"
				id="back-btn"
				type="button"
				onClick={() => {
					const ref = document.referrer;
					const fromPortfolio = ref && (
						ref.includes('index.html')
						|| ref.replace(/\/?$/, '/') === location.href.replace(/cv(\.html)?.*$/, '')
					);
					if(fromPortfolio) {
						history.back();
					}
					else {
						location.href = '/';
					}
				}}
			>
				<ArrowLeftIcon
					className="h-3.5 w-3.5"
				/>
				Back to portfolio
			</button>
			<button
				className="print-btn"
				type="button"
				onClick={() => {
					if(document.title !== SITE_CV_PRINT_TITLE) {
						previousTitleRef.current = document.title;
						document.title = SITE_CV_PRINT_TITLE;
					}
					window.print();
				}}
			>
				<PrinterIcon
					className="h-3.5 w-3.5"
				/>
				Print / Save as PDF
			</button>
		</div>
	);
}
