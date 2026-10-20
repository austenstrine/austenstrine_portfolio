import { googleSignInUrl } from '../../lib/auth-api';
import { GoogleIcon } from '../icons/GoogleIcon';

type GoogleButtonProps = {
	onBeforeNavigate?: () => void;
};

export function GoogleButton({ onBeforeNavigate }: GoogleButtonProps) {
	return (
		<a
			className="
				flex
				w-full
				items-center
				justify-center
				gap-3
				rounded-full
				border
				border-slate-300
				px-4
				py-2.5
				text-sm
				font-semibold
				text-ink
				transition
				hover:border-sky
				hover:text-sky
			"
			href={googleSignInUrl()}
			onClick={() => {
				onBeforeNavigate?.();
			}}
		>
			<GoogleIcon />
			Continue with Google
		</a>
	);
}
