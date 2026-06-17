(function() {
    // 1. Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
        document.documentElement.classList.add('light');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
    }

    // 2. Setup theme toggle button on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        // Find navbar action container
        const navActions = document.querySelector('.nav-actions') || 
                           document.querySelector('.landing-nav-links');
        
        if (!navActions) return;

        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'theme-toggle';
        toggleBtn.type = 'button';
        toggleBtn.title = 'Toggle light/dark theme';
        
        // Use styled classes if available, otherwise inline overrides
        toggleBtn.className = 'btn btn-secondary btn-sm theme-toggle-btn';
        toggleBtn.style.borderRadius = '50%';
        toggleBtn.style.width = '36px';
        toggleBtn.style.height = '36px';
        toggleBtn.style.display = 'inline-flex';
        toggleBtn.style.alignItems = 'center';
        toggleBtn.style.justifyContent = 'center';
        toggleBtn.style.padding = '0';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.flexShrink = '0';
        
        // Set icon depending on current theme
        const isDark = document.documentElement.classList.contains('dark');
        toggleBtn.innerHTML = isDark ? '☀️' : '🌙';

        // Add to navbar (insert at the beginning of the links/actions)
        navActions.insertBefore(toggleBtn, navActions.firstChild);

        // Click handler
        toggleBtn.addEventListener('click', () => {
            const currentlyDark = document.documentElement.classList.contains('dark');
            if (currentlyDark) {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
                localStorage.setItem('theme', 'light');
                toggleBtn.innerHTML = '🌙';
            } else {
                document.documentElement.classList.remove('light');
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
                toggleBtn.innerHTML = '☀️';
            }
        });
    });
})();
