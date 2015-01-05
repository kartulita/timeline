(function (angular, moment) {
	'use strict';

	angular.module('battlesnake.timeline')
		.filter('timelineDate', timelineDateFilter)
		.filter('timelineTime', timelineTimeFilter)
		;

	function timelineDateFilter() {
		return function (when) {
			return moment(when).local().format('dddd DD.MM');
		};
	}

	function timelineTimeFilter() {
		return function (when) {
			return moment(when).local().format('HH:mm');
		};
	}

})(window.angular, window.moment);
