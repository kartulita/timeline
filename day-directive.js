(function (angular, _, moment) {
	'use strict';

	angular.module('battlesnake.timeline')
		.directive('timelineDay', timelineDayDirective);

	function timelineDayDirective($q) {
		return {
			restrict: 'A',
			priority: 10,
			transclude: true,
			scope: true,
			link: link
		};

		function link(scope, element, attrs, controller, transclude) {
			reloadDay();

			var itemsElement;
			return;

			function reloadDay() {
				if (!scope.api) {
					return;
				}
				var day = moment(scope.day).clone().local().startOf('day');
				scope.$emit('dayLoading');
				/*
				 * We get adjacent days and filter to ensure that day groups
				 * correspond to the local time-zone.  Since the front-end
				 * service caches day data, this won't result in redundant
				 * requests to the back-end, and also serves to pre-load
				 * adjacent days if not already loaded.
				 */
				var days = [
					day.clone().subtract(1, 'day'),
					day,
					day.clone().add(1, 'day')
				];
				/* Map days to promises and process result */
				$q.all(days.map(scope.api.getDay))
					.then(filterToday)
					.then(createChildren)
					.finally(emitLoadedEvent);

				function emitLoadedEvent() {
					scope.$emit('dayLoaded', element);
				}

				function emitFailedEvent() {
					scope.$emit('dayLoadFailed', scope.key);
					scope.$destroy();
					element.remove();
				}

				function filterToday(data) {
					return _([].concat.apply([], data))
						.filter(isToday);

					function isToday(item) {
						return moment(item.start).local().startOf('day')
							.toDate().getTime() === day.toDate().getTime();
					}
				}

				function createChildren(data) {
					/*
					 * If no data available, assume no data is available for
					 * this day and notify the controller
					 */
					if (!data.length) {
						emitFailedEvent();
						return;
					}
					/* Store data and create subelements if needed */
					scope.items = data;
					if (!itemsElement) {
						transclude(scope, function (clone, scope) {
							itemsElement = clone.appendTo(element);
						});
					}
				}
			}
		}
	}

})(window.angular, window._, window.moment);
