import type { Metadata } from 'next';
import { CvDocument } from './CvDocument';
import { CvToolbar } from './CvToolbar';
import './cv.css';

export const metadata: Metadata = {
	title: {
		absolute: 'Austen Strine — CV',
	},
	alternates: {
		canonical: '/cv.html',
	},
};

export default function CvPage() {
	return (
		<div className="cv-page">
			<div className="page-shell">
				<CvToolbar />
				<CvDocument />
			</div>
		</div>
	);
}
