(() => {
    'use strict';

    const consentKey = 'cookie-consent';
    const analyticsId = 'G-BFVDQP2TCN';
    const banner = document.getElementById('cookieBanner');
    const copyStatus = document.getElementById('copy-status');
    let analyticsLoaded = false;

    function loadAnalytics() {
        // Local previews must not contribute to production analytics.
        if (analyticsLoaded || !['modrnmind.com', 'www.modrnmind.com'].includes(location.hostname)) {
            return;
        }
        analyticsLoaded = true;
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', analyticsId);

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + analyticsId;
        document.head.appendChild(script);
    }

    let consent = null;
    try {
        consent = localStorage.getItem(consentKey);
    } catch {
        // Storage can be unavailable; consent still works for this page visit.
    }
    if (consent === 'accepted') loadAnalytics();
    if (banner) {
        banner.hidden = ['accepted', 'declined'].includes(consent);
        banner.querySelectorAll('[data-consent]').forEach((button) => {
            button.addEventListener('click', () => {
                const choice = button.dataset.consent;
                try {
                    localStorage.setItem(consentKey, choice);
                } catch {
                    // Do not let storage restrictions prevent the choice.
                }
                banner.hidden = true;
                if (choice === 'accepted') loadAnalytics();
            });
        });
    }

    document.querySelectorAll('[data-copy-prompt]').forEach((button) => {
        let resetTimer;
        button.addEventListener('click', async () => {
            const item = button.closest('.prompt-item');
            const paragraph = item.querySelector('p');
            const title = item.querySelector('h3').textContent;
            const label = 'Copy prompt: ' + title;
            clearTimeout(resetTimer);
            delete button.dataset.copied;
            button.disabled = true;
            if (copyStatus) copyStatus.textContent = '';

            try {
                await navigator.clipboard.writeText(paragraph.textContent.trim());
                button.dataset.copied = 'true';
                button.setAttribute('aria-label', 'Copied: ' + title);
                if (copyStatus) copyStatus.textContent = 'Copied prompt: ' + title;
                resetTimer = setTimeout(() => {
                    delete button.dataset.copied;
                    button.setAttribute('aria-label', label);
                }, 2000);
            } catch {
                // Select the visible text so manual copying remains possible.
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(paragraph);
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                button.setAttribute('aria-label', label);
                if (copyStatus) copyStatus.textContent = 'Could not copy automatically. Select and copy the prompt text.';
            } finally {
                button.disabled = false;
            }
        });
    });
})();
