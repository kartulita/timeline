(function (angular) {
	'use strict';

	angular.module('battlesnake.timeline')
		.directive('timeline', timelineDirective);

	function timelineDirective(timelineService, $window, $timeout) {
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
			var days = element.find('.timeline-days');

			scope.geometry.pageWidth = getPageWidth;
			scope.geometry.viewWidth = getViewWidth;

			scope.view.openDatePicker = openDatePicker;
			scope.view.closeDatePicker = closeDatePicker;

			angular.element($window)
				.bind('resize', scope.methods.revalidateView);

			/* Trigger loading of adjacent days */
			scope.methods.revalidateView();

			scope.$watch('adapter', adapterChanged);
			scope.$watch('view.isDatePickerOpen', datePickerOpenChanged);

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

			/* Geometry */
			function getPageWidth() {
				return element.innerWidth();
			}

			function getViewWidth() {
				return days.outerWidth(true);
			}

			/* Date-picker */
			function openDatePicker($event) {
				if (scope.view.isDatePickerOpening) {
					closeDatePicker();
					return;
				}
				scope.view.isDatePickerOpening = true;
				scope.view.openDatePickerTimer = $timeout(openDatePickerNow, 200);
				return;

				function openDatePickerNow() {
					scope.view.isDatePickerOpen = true;
					scope.view.openDatePickerTimer = null;
					var rect = element.find('.timeline-goto')[0].getBoundingClientRect();
					var dropDown = angular.element('.dropdown-menu');
					$timeout(function delayedPositioning() {
						dropDown.css({
							top: rect.bottom + 'px',
							left: (rect.right - dropDown.outerWidth()) + 'px'
						});
					}, 0);
				}
			}

			function closeDatePicker() {
				scope.view.isDatePickerOpen = false;
				scope.view.isDatePickerOpening = false;
				$timeout.cancel(scope.view.openDatePickerTimer);
			}

			function datePickerOpenChanged(value) {
				if (!value) {
					closeDatePicker();
				}
			}

		}
	}

})(window.angular);
