import { GUIDED_DEMO_PRODUCT } from '../../lib/site';

export function DemoIntro() {
	return (
		<section
			className="
				overflow-hidden
				rounded-3xl
				bg-ink
				px-6
				py-8
				text-white
				md:px-10
				md:py-12
			"
		>
			<h1
				className="
					max-w-xl
					text-3xl
					font-semibold
					tracking-tight
					md:text-5xl
				"
			>
				Shop independent sellers in one cart
			</h1>
			<p
				className="
					mt-4
					max-w-xl
					text-sm
					leading-6
					text-white/75
					md:text-base
				"
			>
				Live inventory from multiple vendors, pack and piece units, and Stripe
				checkout. This catalog is a working demo — sign in to buy.
			</p>
			<div
				className="
					mt-6
					flex
					flex-wrap
					gap-3
				"
			>
				<a
					className="
						rounded-full
						bg-white
						px-5
						py-2.5
						text-sm
						font-semibold
						text-ink
						hover:bg-frost
					"
					href="/place-et-marque/search"
				>
					Shop all products
				</a>
				<a
					className="
						rounded-full
						border
						border-white/30
						px-5
						py-2.5
						text-sm
						font-semibold
						text-white
						hover:border-white
					"
					href={GUIDED_DEMO_PRODUCT.href}
				>
					{GUIDED_DEMO_PRODUCT.title}
				</a>
			</div>
		</section>
	);
}
