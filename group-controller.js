(function (angular, _) {
	'use strict';

	angular.module('battlesnake.timeline')
		.controller('timelineGroupController', timelineGroupController);

	function timelineGroupController($scope, $q) {
		var scope = $scope;
		var element;
		var transclude;
		var itemsElement;

		this.init = initController;
		return;

		function initController(_element, _transclude) {
			element = _element;
			transclude = _transclude;
			loadGroup();
		}

		function loadGroup() {
			if (!scope.api) {
				return;
			}
			var group = scope.group;
			var date = group.date;
			/*
			 * We get adjacent groups and filter to ensure that group groups
			 * correspond to the local time-zone.  Since the front-end
			 * service caches group data, this won't result in redundant
			 * requests to the back-end, and also serves to pre-load
			 * adjacent groups if not already loaded.
			 */
			var groupsToGet = [
				date.clone().subtract(1, scope.model.groupBy),
				date,
				date.clone().add(1, scope.model.groupBy)
			];
			/* Map groups to promises and process result */
			$q.when(null)
				.then(function () {
					group.loading = true;
					scope.$emit('groupLoading');
				})
				.then(function () {
					return $q.all(groupsToGet.map(scope.api.getGroup));
				})
				.then(function (data) { return [].concat.apply([], data); })
				.then(filterData)
				.then(sortData)
				.then(validateData)
				.then(createChildren)
				.then(function () { group.loaded = true; })
				.catch(function () {
					group.failed = true;
					scope.$emit('groupLoadFailed');
					scope.$destroy();
					element.remove();
				})
				.finally(function () {
					group.loading = false;
					scope.$emit('groupLoaded', element);
				})
				;

			return;

			function filterData(data) {
				return _(data)
					.filter(isNow);

				function isNow(item) {
					return date.isSame(item.start, scope.model.groupBy);
				}
			}

			function sortData(data) {
				return _(data)
					.sort(momentComparator);

				function momentComparator(a, b) {
					return a.start.diff(b.start);
				}
			}

			function validateData(data) {
				/*
				 * If no data available, assume error in backend (unless
				 * explicitly told not to), then notify the controller via
				 * promise-chain error handler
				 */
				if (!data.length && String(scope.allowEmptyGroups) !== 'true') {
					return $q.reject('No data');
				}
				return data;
			}

			function createChildren(data) {
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
