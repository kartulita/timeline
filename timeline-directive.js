(function (angular) {
	'use strict';

	angular.module('battlesnake.timeline')
		.directive('timeline', timelineDirective);

	function timelineDirective() {
		return {
			restrict: 'A',
			require: 'timeline',
			controller: 'timelineController',
			scope: {
				adapter: '=timeline',
				onOpenItem: '&timelineOpenItem',
				initialDate: '@timelineInitialDate',
				groupBy: '@timelineGroupBy',
				noCalendar: '@timelineNoCalendar',
				allowEmptyGroups: '@timelineAllowEmptyGroups'
			},
			templateUrl: 'timeline-template.html',
			link: link
		};

		function link(scope, element, attrs, controller) {
			controller.init(element);
		}
	}

})(window.angular);
