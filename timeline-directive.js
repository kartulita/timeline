(function (angular) {
	'use strict';

	angular.module('battlesnake.timeline')
		.directive('timeline', timelineDirective);

	function timelineDirective(timelineService, $window) {
		return {
			restrict: 'A',
			scope: {
				adapter: '=timeline',
				onOpenItem: '&timelineOpenItem',
			},
			controller: 'timelineController',
			templateUrl: 'timeline-template.html',
			link: link
		};

		function link(scope, element, attrs, controller) {
			var days = element.find('.timeline-days');

			scope.geometry.pageWidth = getPageWidth;
			scope.geometry.viewWidth = getViewWidth;

			angular.element($window)
				.bind('resize', scope.methods.revalidateView);

			scope.methods.revalidateView();

			scope.$watch('adapter', adapterChanged);

			return;

			function adapterChanged() {
				if (scope.adapter) {
					scope.api = timelineService.connect(scope.adapter);
				} else {
					scope.api = null;
				}
				scope.model.reset();
			}

			function getPageWidth() {
				return element.innerWidth();
			}

			function getViewWidth() {
				return days.outerWidth(true);
			}
		}
	}

})(window.angular);
