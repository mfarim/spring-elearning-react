/**
 * Analytics Initializer for Umami Analytics and Google Analytics (GA4).
 * Dynamically injects script tags if environment variables are provided.
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;

  // 1. Umami Analytics Initialization
  const umamiScriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL;
  const umamiWebsiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;

  if (umamiScriptUrl && umamiWebsiteId) {
    const existingUmami = document.querySelector(`script[data-website-id="${umamiWebsiteId}"]`);
    if (!existingUmami) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = umamiScriptUrl;
      script.setAttribute('data-website-id', umamiWebsiteId);
      document.head.appendChild(script);
    }
  }

  // 2. Google Analytics 4 (GA4) Initialization
  const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (gaMeasurementId) {
    const existingGa = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gaMeasurementId}"]`);
    if (!existingGa) {
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
      document.head.appendChild(gaScript);

      const win = window as any;
      win.dataLayer = win.dataLayer || [];
      function gtag(...args: any[]) {
        win.dataLayer.push(args);
      }
      win.gtag = gtag;

      gtag('js', new Date());
      gtag('config', gaMeasurementId);
    }
  }
}
