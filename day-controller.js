(function (angular, moment, _) {
	'use strict';

	angular.module('battlesnake.timeline')
		.controller('timelineDayController', timelineDayController);

	function timelineDayController($scope, $q, $timeout) {
		var scope = $scope;
		var element;
		var transclude;
		var itemsElement;

		this.init = initController;
		return;

		function initController(_element, _transclude) {
			element = _element;
			transclude = _transclude;
			scope.$on('scrollChanged', positionTitle);
			reloadDay();
		}

		function positionTitle(event, offset, width) {
			var e_l = element.position().left - offset;
			var e_w = element.innerWidth();
			var e_r = e_l + e_w;
			var title = element.find('.timeline-day-title');
			var t_w = title.find('>*').outerWidth(true);
			if (e_l <= 0 && e_r >= t_w) {
				title.css({ left: -e_l + 'px' });
			} else if (e_l < 0 && e_r > 0) {
				title.css({ left: e_w - t_w + 'px' });
			} else if (e_l > 0) {
				title.css({ left: 0 });
			} else {
				title.css({ left: e_w - t_w + 'px' });
			}
		}

		function reloadDay() {
			if (!scope.api) {
				return;
			}
			var day = scope.day.clone();
			/*
			 * We get adjacent days and filter to ensure that day groups
			 * correspond to the local time-zone.  Since the front-end
			 * service caches day data, this won't result in redundant
			 * requests to the back-end, and also serves to pre-load
			 * adjacent days if not already loaded.
			 */
			var daysToGet = [
				day.clone().subtract(1, 'day'),
				day,
				day.clone().add(1, 'day')
			];
			/* Map days to promises and process result */
			scope.$emit('dayLoading');
			$q.all(daysToGet.map(scope.api.getDay))
				.then(filterAndSort)
				.then(createChildren)
				.finally(emitLoadedEvent);

			return;

			function emitLoadedEvent() {
				scope.$emit('dayLoaded', element);
			}

			function emitFailedEvent() {
				scope.$emit('dayLoadFailed', scope.key);
				scope.$destroy();
				element.remove();
			}

			function filterAndSort(data) {
				return _([].concat.apply([], data))
					.filter(isToday)
					.sort(momentComparator);

				function isToday(item) {
					return day.isSame(item.start, 'day');
				}

				function momentComparator(a, b) {
					return a.start.diff(b.start);
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
				/* Delay showing day to give images time to load and reflow */
				$timeout(showContent, 200);

				return;

				function showContent() {
					element.css('visibility', 'visible');
				}
			}
		}

	}

})(window.angular, window.moment, window._);
