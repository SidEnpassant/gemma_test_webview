/**
 * Whether a device can host the model, and why.
 *
 * The app measures, this decides. The decision lives on the web side on
 * purpose: when the orchestration backend takes it over, it replaces this file
 * and the app does not change — it keeps reporting the same raw facts and
 * keeps doing what it is told.
 *
 * The app sends only measurements. Nothing here is computed in the browser
 * from browser APIs: `navigator.deviceMemory` snaps to a power of two and does
 * not exist on iOS, so it cannot answer a 4 GB question.
 */
(function (root) {
  'use strict';

  // A nominal 4 GB phone reports ~3.6-3.8 GB: the kernel takes GPU, radio and
  // bootloader memory before the OS ever sees it, so a literal 4096 test
  // rejects every real 4 GB device. This is the knob to turn once the fleet
  // says what actually runs.
  var MIN_RAM_MB = 3500;

  function gb(mb) { return (Number(mb) / 1024).toFixed(1); }

  /**
   * @param {{ramMB:number, model:string, os:string}} device as sent by the app
   * @returns {{capable:boolean, reason:string}} reason is shown verbatim
   */
  function decide(device) {
    var ram = device ? Number(device.ramMB) : NaN;

    // Unknown is not a yes. Desktop and web report 0 here.
    if (!isFinite(ram) || ram <= 0) {
      return {
        capable: false,
        reason: 'Cannot tell how much memory this device has, so the ' +
          'on-device model is not offered.'
      };
    }
    if (ram < MIN_RAM_MB) {
      return {
        capable: false,
        reason: 'Cannot run the model on this device — it reports ' +
          gb(ram) + ' GB of RAM, and about 4 GB is needed.'
      };
    }
    return {
      capable: true,
      reason: 'Enough memory to run the on-device model.'
    };
  }

  var api = { minRamMB: MIN_RAM_MB, decide: decide, gb: gb };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GemmaPolicy = api;
})(typeof self !== 'undefined' ? self : this);
