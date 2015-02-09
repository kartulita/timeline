(function (angular, _) {
	'use strict';

	angular.module('battlesnake.timeline')
		.directive('timelineDays', timelineDaysDirective);

	function timelineDaysDirective() {
		return {
			restrict: 'A',
			priority: 10,
			require: 'timelineDays',
			controller: 'timelineDaysController',
			transclude: true,
			link: link
		};

		function link(scope, element, attrs, controller, transclude) {
			controller.init(element, transclude);
		}
	}

})(window.angular, window._);
