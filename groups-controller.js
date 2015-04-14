(function (angular, _) {
	'use strict';

	angular.module('battlesnake.timeline')
		.controller('timelineGroupsController', timelineGroupsController);

	function timelineGroupsController($scope) {
		var scope = $scope;

		var element;
		var transclude;

		var groupCache = {};

		this.init = initController;
		return;

		function initController(_element, _transclude) {
			element = _element;
			transclude = _transclude;
			/* Event handlers */
			scope.$on('groupsChanged', updateGroups);
			scope.$on('modelReset', clearCache);
		}

		/* Create elements as needed */
		function updateGroups() {
			_(scope.model.groups).each(updateGroupElement);
		}

		/* Create element for a group if needed, does not delete/update */
		function updateGroupElement(group) {
			var date = group.date;
			var key = dateToKey(date);
			var cacheLine;
			if (_(groupCache).has(key)) {
				return;
			} else {
				cacheLine = {
					serial: date.toDate().getTime(),
					generation: scope.model.resetCount,
					element: null,
					scope: null
				};
				groupCache[key] = cacheLine;
			}
			var itemScope = scope.$new();
			itemScope.group = group;
			transclude(itemScope, function (clone, scope) {
				scope.key = key;
				cacheLine.element = clone;
				cacheLine.scope = scope;
				var position = findGroupElementPosition(date);
				if (position.prev) {
					clone.insertAfter(position.prev.last());
				} else if (position.next) {
					clone.insertBefore(position.next.first());
				} else {
					clone.appendTo(element);
				}
			});
		}

		/* Create cache key for a date (must be chronologically sortable) */
		function dateToKey(date) {
			return date.format('YYYY-MM-DD HH:mm');
		}

		/* Find the elements that a group should be inserted between */
		function findGroupElementPosition(date) {
			var ticks = date.toDate().getTime();
			var res = _(groupCache)
				.reduce(function (memo, cacheLine) {
					var serial = cacheLine.serial;
					var prev = memo.prev;
					var next = memo.next;
					if (serial < ticks && (!prev || serial > prev.serial)) {
						memo.prev = cacheLine;
					}
					if (serial > ticks && (!next || serial < next.serial)) {
						memo.next = cacheLine;
					}
					return memo;
				}, { prev: null, next: null });
			if (res.prev) {
				res.prev = res.prev.element;
			}
			if (res.next) {
				res.next = res.next.element;
			}
			return res;
		}

		/* Empty the cache */
		function clearCache() {
			_(groupCache).each(function (line, key) {
				delete groupCache[key];
				line.element.remove();
				line.scope.$destroy();
			});
		}

	}

})(window.angular, window._);
