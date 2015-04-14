(function (angular, _) {
	'use strict';

	angular.module('battlesnake.timeline')
		.directive('timelineGroup', timelineGroupDirective);

	function timelineGroupDirective() {
		return {
			restrict: 'A',
			priority: 10,
			require: 'timelineGroup',
			controller: 'timelineGroupController',
			transclude: true,
			link: link
		};

		function link(scope, element, attrs, controller, transclude) {
			controller.init(element, transclude);
		}
	}

})(window.angular, window._);
