type AuthReasonBannerProps = {
	reason: string | null;
};

export function AuthReasonBanner({ reason }: AuthReasonBannerProps) {
	if(!reason) {
		return null;
	}

	return (
		<div
			className="
				mb-5
				rounded-xl
				border
				border-sky/30
				bg-sky/5
				px-4
				py-3
				text-sm
				text-slate-700
			"
		>
			{reason}
		</div>
	);
}
