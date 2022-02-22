/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"oupotc.zotcpodupld./z_otc_pod_upld/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
