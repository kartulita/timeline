(function (angular, _) {
	'use strict';

	angular.module('battlesnake.timeline')
		.directive('timelineDay', timelineDayDirective);

	function timelineDayDirective() {
		return {
			restrict: 'A',
			priority: 10,
			require: 'timelineDay',
			controller: 'timelineDayController',
			transclude: true,
			link: link
		};

		function link(scope, element, attrs, controller, transclude) {
			controller.init(element, transclude);
		}
	}

})(window.angular, window._);
