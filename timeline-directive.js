(function (angular) {
	'use strict';

	angular.module('battlesnake.timeline')
		.directive('timeline', timelineDirective);

	function timelineDirective(timelineService) {
		return {
			restrict: 'A',
			require: 'timeline',
			scope: {
				adapter: '=timeline',
				nowPlaying: '=',
				onOpenItem: '&timelineOpenItem',
			},
			controller: 'timelineController',
			templateUrl: 'timeline-template.html',
			link: link
		};

		function link(scope, element, attrs, controller) {
			/* Observers */
			scope.$watch('adapter', adapterChanged);

			/* Initialise controller */
			scope.initController(element);

			return;

			/* Adapter */
			function adapterChanged() {
				if (scope.adapter) {
					scope.api = timelineService.connect(scope.adapter);
				} else {
					scope.api = null;
				}
				scope.$broadcast('adapterChanged');
			}

		}
	}

})(window.angular);
