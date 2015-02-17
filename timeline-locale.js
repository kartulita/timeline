(function (angular) {
	'use strict';

	angular.module('battlesnake.timeline')
		.factory('timelineLocale', timelineLocale);

	/*
	 * Declared once and outside the factory since the injector hack used by
	 * timeline-adapter would otherwise get a new instance of the translations
	 */
	var strings = {
		en: {
			playLive: 'Now playing',
			today: 'Today',
		},
		et: {
			playLive: 'Vaata otse', /* timeline-adapter in battlesnake.err modifies/decorates for radio channels */
			today: 'Täna',
		},
		ru: {
			playLive: null,
			today: 'Сегодня',
		}
	}

	function timelineLocale() {
		return strings;
	}

})(window.angular);
