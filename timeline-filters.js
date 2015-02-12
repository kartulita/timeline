(function (angular, moment) {
	'use strict';

	angular.module('battlesnake.timeline')
		.filter('timelineDate', timelineDateFilter)
		.filter('timelineTime', timelineTimeFilter)
		;

	function timelineDateFilter(languageService, timelineLocale) {
		var lang = languageService(timelineLocale);
		return function (when) {
			return when.isSame(moment(), 'day') ? lang('today') : when.format('dddd DD.MM').replace(/^[a-z]/, function (c) { return c.toUpperCase(); });
		};
	}

	function timelineTimeFilter() {
		return function (when) {
			return when.format('HH:mm');
		};
	}

})(window.angular, window.moment);
