/**
 * Deschiderea ferestrei de plată, în browser.
 *
 * Scriptul Paddle se încarcă abia când omul apasă butonul, nu la fiecare vizită:
 * majoritatea vizitatorilor nu ajung niciodată să plătească, iar pagina de start
 * n-are de ce să fie mai grea din cauza lor.
 */

const SCRIPT = 'https://cdn.paddle.com/paddle/v2/paddle.js';

let loading = null;

function loadScript() {
  if (window.Paddle) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = SCRIPT;
    el.async = true;
    el.onload = resolve;
    el.onerror = () => reject(new Error('Nu am putut încărca fereastra de plată.'));
    document.head.appendChild(el);
  });
  return loading;
}

let ready = false;

/**
 * Deschide plata pentru o tranzacție pregătită pe server.
 *
 * @param {{transactionId: string, clientToken: string, environment: string}} session
 * @param {{onCompleted?: () => void, onClosed?: () => void}} handlers
 */
export async function openCheckout(session, handlers = {}) {
  await loadScript();

  if (!ready) {
    // În sandbox, Paddle trebuie să știe că nu suntem în producție, altfel
    // caută tranzacția în contul greșit și dă „not found".
    if (session.environment === 'sandbox') window.Paddle.Environment.set('sandbox');

    window.Paddle.Initialize({
      token: session.clientToken,
      eventCallback: (event) => {
        if (event?.name === 'checkout.completed') handlers.onCompleted?.();
        if (event?.name === 'checkout.closed') handlers.onClosed?.();
      },
    });
    ready = true;
  }

  window.Paddle.Checkout.open({ transactionId: session.transactionId });
}
