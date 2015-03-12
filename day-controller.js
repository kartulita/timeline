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
			var day = scope.day;
			var date = day.date;
			/*
			 * We get adjacent days and filter to ensure that day groups
			 * correspond to the local time-zone.  Since the front-end
			 * service caches day data, this won't result in redundant
			 * requests to the back-end, and also serves to pre-load
			 * adjacent days if not already loaded.
			 */
			var daysToGet = [
				date.clone().subtract(1, 'day'),
				date,
				date.clone().add(1, 'day')
			];
			/* Map days to promises and process result */
			$q.when(null)
				.then(function () {
					day.loading = true;
					scope.$emit('dayLoading');
				})
				.then(function () {
					return $q.all(daysToGet.map(scope.api.getDay));
				})
				.then(function (data) { return [].concat.apply([], data); })
				.then(filterData)
				.then(sortData)
				.then(createChildren)
				.then(function () { day.loaded = true; })
				.finally(function () {
					day.loading = false;
					scope.$emit('dayLoaded', element);
				})
				.catch(function () {
					day.failed = true;
					scope.$emit('dayLoadFailed');
					scope.$destroy();
					element.remove();
				})
				;

			return;

			function filterData(data) {
				return _(data)
					.filter(isToday);

				function isToday(item) {
					return day.date.isSame(item.start, 'day');
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

				return;
			}
		}

	}

})(window.angular, window._);
