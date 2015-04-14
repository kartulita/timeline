(function (angular, moment) {
	'use strict';

	angular.module('battlesnake.timeline')
		.filter('timelineGroupWhen', timelineGroupWhenFilter)
		.filter('timelineItemWhen', timelineItemWhenFilter)
		;

	function timelineGroupWhenFilter(languageService, timelineLocale) {
		var lang = languageService(timelineLocale);
		return function (when, groupBy) {
			return when.isSame(moment(), groupBy) ?
				lang('today') :
				when.format(lang('groupWhenFormat')).replace(/^[a-z]/, function (c) { return c.toUpperCase(); });
		};
	}

	function timelineItemWhenFilter(languageService, timelineLocale) {
		var lang = languageService(timelineLocale);
		return function (when) {
			return when.format(lang('itemWhenFormat'));
		};
	}

})(window.angular, window.moment);
