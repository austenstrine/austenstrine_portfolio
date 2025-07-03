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