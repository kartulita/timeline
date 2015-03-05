(function (angular, _) {
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
			reloadDay();
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
			$q.when(null)
				.then(function () {
					scope.$emit('dayLoading');
				})
				.then(function () {
					return $q.all(daysToGet.map(scope.api.getDay));
				})
				.finally(function () {
					scope.$emit('dayLoaded', element);
				})
				.then(function (data) { return [].concat.apply([], data); })
				.then(filterData)
				.then(sortData)
				.then(createChildren)
				.catch(function () {
					scope.$destroy();
					element.remove();
				})
				;

			return;

			function filterData(data) {
				return _(data)
					.filter(isToday);

				function isToday(item) {
					return day.isSame(item.start, 'day');
				}
			}

			function sortData(data) {
				return _(data)
					.sort(momentComparator);

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
					throw new Error('No data');
				}
				/* Store data and create subelements if needed */
				scope.items = data;
				if (!itemsElement) {
					transclude(scope, function (clone, scope) {
						itemsElement = clone.appendTo(element);
					});
				}
				showContent();

				return;

				function showContent() {
					element.css('visibility', 'visible');
				}
			}
		}

	}

})(window.angular, window._);
