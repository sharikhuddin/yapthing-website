'use strict';
// The legacy polling worker bypassed global budget reservations and is retired.
// Customer tasks must enter through authenticated yapcode-execute admission.
console.error('Legacy YapCode polling is disabled. Use the bounded authenticated yapcode-execute gateway.');
process.exitCode=1;
