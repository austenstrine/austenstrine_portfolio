// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
	anchor.addEventListener('click', function (e) {
		e.preventDefault();
		const target = document.querySelector(this.getAttribute('href'));
		if (target) {
			target.scrollIntoView({
				behavior: 'smooth',
				block: 'start'
			});
		}
	});
});

// Copy-to-clipboard buttons
const toast = document.createElement('div');
toast.className = 'copy-toast';
toast.textContent = 'Copied to clipboard';
document.body.appendChild(toast);

function copyText(text) {
	// execCommand is synchronous and reliable inside a click handler across all browsers
	const ta = document.createElement('textarea');
	ta.value = text;
	ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
	document.body.appendChild(ta);
	ta.focus();
	ta.select();
	let ok = false;
	try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
	document.body.removeChild(ta);

	if (ok) return Promise.resolve();

	// fallback to async Clipboard API if execCommand isn't available
	if (navigator.clipboard) return navigator.clipboard.writeText(text);

	return Promise.reject(new Error('Copy not supported'));
}

let toastTimer;
document.querySelectorAll('.copy-btn').forEach(btn => {
	btn.querySelector('.copy-tooltip').textContent = 'Copy to clipboard';

	btn.addEventListener('click', () => {
		copyText(btn.dataset.copy).then(() => {
			const tip = btn.querySelector('.copy-tooltip');
			tip.textContent = 'Copied!';
			setTimeout(() => { tip.textContent = 'Copy to clipboard'; }, 1800);

			clearTimeout(toastTimer);
			toast.classList.add('visible');
			toastTimer = setTimeout(() => toast.classList.remove('visible'), 2000);
		});
	});
});


// Header background change on scroll
window.addEventListener('scroll', () => {
	const header = document.querySelector('header');
	if (window.scrollY > 100) {
		header.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%)';
		header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
	} else {
		header.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 249, 250, 0.95) 100%)';
		header.style.boxShadow = 'none';
	}
});

// Intersection Observer for scroll animations
const observerOptions = {
	threshold: 0.1,
	rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
	entries.forEach(entry => {
		if (entry.isIntersecting) {
			entry.target.style.opacity = '1';
			entry.target.style.transform = 'translateY(0)';
		}
	});
}, observerOptions);

// Observe all sections for scroll animations
document.querySelectorAll('section').forEach(section => {
	section.style.opacity = '0';
	section.style.transform = 'translateY(30px)';
	section.style.transition = 'all 0.6s ease';
	observer.observe(section);
}); 