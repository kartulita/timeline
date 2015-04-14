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
			groupWhenFormat: 'dddd DD.MM',
			itemWhenFormat: 'HH:mm',
		},
		et: {
			/* battlesnake.err:timeline-adapter modifies/decorates playLive for radio channels */
			playLive: 'Vaata otse',
			today: 'Täna',
			groupWhenFormat: 'dddd DD.MM',
			itemWhenFormat: 'HH:mm',
		},
		ru: {
			playLive: 'Прямой эфир',
			today: 'Сегодня',
			groupWhenFormat: 'dddd DD.MM',
			itemWhenFormat: 'HH:mm',
		}
	};

	function timelineLocale() {
		return strings;
	}

})(window.angular);
