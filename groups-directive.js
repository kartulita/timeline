(function (angular, _) {
	'use strict';

	angular.module('battlesnake.timeline')
		.directive('timelineGroups', timelineGroupsDirective);

	function timelineGroupsDirective() {
		return {
			restrict: 'A',
			priority: 10,
			require: 'timelineGroups',
			controller: 'timelineGroupsController',
			transclude: true,
			link: link
		};

		function link(scope, element, attrs, controller, transclude) {
			controller.init(element, transclude);
		}
	}

})(window.angular, window._);
