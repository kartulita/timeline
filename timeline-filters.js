(function (angular, moment) {
	'use strict';

	angular.module('battlesnake.timeline')
		.factory('timelineStrings', timelineStringsFactory)
		.filter('timelineDate', timelineDateFilter)
		.filter('timelineTime', timelineTimeFilter)
		;

	function timelineStringsFactory() {
		var lang = window.navigator.userLanguage || window.navigator.language || 'en';
		lang = lang.split('-')[0];
		var today = {
			en: 'Today',
			et: 'Täna',
			ru: 'Сегодня'
		};
		return {
			today: today[lang] || today.en
		};
	}

	function timelineDateFilter(timelineStrings) {
		return function (when) {
			return when.isSame(moment(), 'day') ? timelineStrings.today : when.format('dddd DD.MM');
		};
	}

	function timelineTimeFilter() {
		return function (when) {
			return when.format('HH:mm');
		};
	}

})(window.angular, window.moment);
