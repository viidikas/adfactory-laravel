import { createApp, h } from 'vue';
import { createInertiaApp } from '@inertiajs/vue3';

// The app's API calls use the global fetch() (not axios), so they don't get
// Laravel's CSRF token automatically. Now that /api/* is CSRF-protected, wrap
// fetch() to attach the X-XSRF-TOKEN header (read from the XSRF-TOKEN cookie
// Laravel sets on every response) for same-origin, state-changing requests.
const readXsrfToken = () => {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
};

const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
    const method = (init.method || (input && input.method) || 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const sameOrigin = url.startsWith('/') || url.startsWith(window.location.origin);

    if (sameOrigin && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const token = readXsrfToken();
        if (token) {
            const headers = new Headers(init.headers || (typeof input === 'object' ? input.headers : undefined) || {});
            if (!headers.has('X-XSRF-TOKEN')) {
                headers.set('X-XSRF-TOKEN', token);
            }
            init = { ...init, headers };
        }
    }

    return originalFetch(input, init);
};

createInertiaApp({
    title: (title) => title ? `${title} - AD.FACTORY` : 'AD.FACTORY',
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.vue', { eager: true });
        return pages[`./Pages/${name}.vue`];
    },
    setup({ el, App, props, plugin }) {
        createApp({ render: () => h(App, props) })
            .use(plugin)
            .mount(el);
    },
});
