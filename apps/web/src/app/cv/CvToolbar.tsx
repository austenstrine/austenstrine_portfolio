'use client';

import { ArrowLeftIcon } from '../../components/icons/ArrowLeftIcon';
import { PrinterIcon } from '../../components/icons/PrinterIcon';

export function CvToolbar() {
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
