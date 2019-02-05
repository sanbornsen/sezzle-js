var SezzleJS = require('./sezzle');

// Assumes document.sezzleConfig is present
window.onload = new SezzleJS(document.sezzleConfig).init();