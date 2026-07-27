import type { ReactNode } from 'react';

type AuthCardProps = {
	title: string;
	subtitle?: string;
	children: ReactNode;
	footer?: ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
	return (
		<div
			className="
				mx-auto
				w-full
				max-w-md
				rounded-2xl
				border
				border-slate-200
				bg-white
				p-8
				shadow-sm
			"
		>
			<h1
				className="
					text-2xl
					font-semibold
					text-ink
				"
			>
				{title}
			</h1>
			{
				subtitle && (
					<p
						className="
							mt-2
							text-sm
							text-slate-600
						"
					>
						{subtitle}
					</p>
				)
			}

			<div className="mt-6">
				{children}
			</div>

			{
				footer && (
					<div
						className="
							mt-6
							border-t
							border-slate-100
							pt-5
							text-sm
							text-slate-600
						"
					>
						{footer}
					</div>
				)
			}
		</div>
	);
}
