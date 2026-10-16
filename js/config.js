// Keep requests on the list's origin and mount path (currently /list/).
export const API_URL = new URL('../', import.meta.url).href.replace(/\/$/, '');
if (typeof toastr !== 'undefined') {
  toastr.options = {
    "closeButton": true, // enables close button
    "progressBar": true, // enables progress bar
  };
}
