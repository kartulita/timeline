(function (angular) {
	'use strict';
	
	angular.module('battlesnake.timeline')
		.directive('timeline', timelineDirective);

	function timelineDirective($window) {
		return {
			restrict: 'A',
			scope: {
				source: '@timeline'
			},
			controller: 'timelineController',
			templateUrl: '../timeline.html',
			link: link
		};

		function link(scope, element, attrs, controller) {
			var days = element.find('.timeline-days');

			scope.geometry.pageWidth = getPageWidth;
			scope.geometry.viewWidth = getViewWidth;

			angular.element($window)
				.bind('resize', scope.methods.revalidateView);

			scope.methods.revalidateView();

			return;

			function getPageWidth() {
				return element.innerWidth();
			}

			function getViewWidth() {
				return days.outerWidth(true);
			}
		}
	}
		
})(window.angular);
