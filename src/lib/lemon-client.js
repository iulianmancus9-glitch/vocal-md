/**
 * Deschiderea ferestrei de plată, în browser.
 *
 * Scriptul se încarcă abia când omul apasă butonul, nu la fiecare vizită:
 * majoritatea vizitatorilor nu ajung niciodată să plătească, iar pagina de start
 * n-are de ce să fie mai grea din cauza lor.
 */

const SCRIPT = 'https://assets.lemonsqueezy.com/lemon.js';

let loading = null;

function loadScript() {
  if (window.LemonSqueezy) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = SCRIPT;
    el.defer = true;
    el.onload = () => {
      // Într-o pagină React scriptul se încarcă după ce s-a desenat totul, deci
      // nu mai găsește singur butoanele; `createLemonSqueezy` îl pornește manual.
      window.createLemonSqueezy?.();
      resolve();
    };
    el.onerror = () => reject(new Error('Nu am putut încărca fereastra de plată.'));
    document.head.appendChild(el);
  });
  return loading;
}

let ready = false;

/**
 * Deschide plata pentru un checkout pregătit pe server.
 *
 * Reușita anunțată aici nu deblochează nimic — pagina întreabă serverul, iar
 * serverul crede doar webhook-ul semnat. Browserul poate minți.
 *
 * @param {{url: string}} session
 * @param {{onCompleted?: () => void, onClosed?: () => void}} handlers
 */
export async function openCheckout(session, handlers = {}) {
  await loadScript();

  // Setup se cheamă o singură dată: a doua oară ar înlocui handlerul, iar
  // evenimentele unei plăți în curs ar ajunge în gol.
  if (!ready) {
    window.LemonSqueezy.Setup({
      eventHandler: (event) => {
        const name = typeof event === 'string' ? event : event?.event;
        if (name === 'Checkout.Success') handlers.onCompleted?.();
        if (name === 'Checkout.Closed' || name === 'PaymentMethodUpdate.Closed') {
          handlers.onClosed?.();
        }
      },
    });
    ready = true;
  }

  window.LemonSqueezy.Url.Open(session.url);
}
