(function (angular) {
	'use strict';

	angular.module('demo')
		.value('ETVEndpoint', 'http://etv.err.ee/api/loader')
		.value('R2Endpoint', 'http://r2.err.ee/api/loader')
		;

})(window.angular);
