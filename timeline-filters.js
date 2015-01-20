(function (angular, moment) {
	'use strict';

	angular.module('battlesnake.timeline')
		.filter('timelineDate', timelineDateFilter)
		.filter('timelineTime', timelineTimeFilter)
		;

	function timelineDateFilter() {
		return function (when) {
			return when.format('dddd DD.MM');
		};
	}

	function timelineTimeFilter() {
		return function (when) {
			return when.format('HH:mm');
		};
	}

})(window.angular, window.moment);
