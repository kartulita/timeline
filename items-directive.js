(function (angular) {
	'use strict';

	angular.module('battlesnake.timeline')
		.directive('timelineItems', timelineItemsDirective);

	function timelineItemsDirective() {
		return {
			restrict: 'A',
			priority: 10,
			require: 'timelineItems',
			controller: 'timelineItemsController',
			transclude: true,
			link: link
		};

		function link(scope, element, attrs, controller, transclude) {
			controller.init(element, transclude);
		}
	}

})(window.angular);
