(function (angular) {
	'use strict';

	angular.module('battlesnake.timeline')
		.service('timelineLocale', timelineLocale);

	function timelineLocale() {
		this.en = {
			onAir: 'Now playing',
			today: 'Today',
			clear: 'Clear',
			close: 'Close'
		};
		this.et = {
			onAir: 'Vaata otse',
			today: 'Täna',
			clear: 'Eemaldama',
			close: 'Sulgema'
		};
		this.ru = {
			onAir: null,
			today: 'Сегодня',
			clear: null,
			close: null
		};
	}

})(window.angular);
