(function (angular, _) {
	'use strict';

	angular.module('battlesnake.timeline')
		.controller('timelineDaysController', timelineDaysController);

	function timelineDaysController($scope) {
		var scope = $scope;

		var element;
		var transclude;

		var dayCache = {};

		this.init = initController;
		return;

		function initController(_element, _transclude) {
			element = _element;
			transclude = _transclude;
			/* Event handlers */
			scope.$on('daysChanged', updateDays);
			scope.$on('modelReset', clearCache);
			scope.$on('dayLoadFailed', dayLoadFailed);
		}

		/* Create elements as needed */
		function updateDays() {
			_(scope.model.days).each(createDayElement);
		}

		/* Create element for a day if needed */
		function createDayElement(day) {
			var key = dayToKey(day);
			var cacheLine;
			if (_(dayCache).has(key)) {
				return;
			} else {
				cacheLine = {
					serial: day.toDate().getTime(),
					generation: scope.model.resetCount,
					element: null,
					scope: null
				};
				dayCache[key] = cacheLine;
			}
			var itemScope = scope.$new();
			itemScope.day = day.clone();
			transclude(itemScope, function (clone, scope) {
				scope.key = key;
				cacheLine.element = clone;
				cacheLine.scope = scope;
				var position = findDayElementPosition(day);
				if (position.prev) {
					clone.insertAfter(position.prev.last());
				} else if (position.next) {
					clone.insertBefore(position.next.first());
				} else {
					clone.appendTo(element);
				}
			});
		}

		/* Create cache key for a day (must be chronologically sortable) */
		function dayToKey(day) {
			return day.format('YYYY-MM-DD');
		}

		/* Find the elements that a day should be inserted between */
		function findDayElementPosition(day) {
			var ticks = day.toDate().getTime();
			var res = _(dayCache)
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
			_(dayCache).each(function (line, key) {
				delete dayCache[key];
				line.element.remove();
				line.scope.$destroy();
			});
		}

		/* Handle error and notify parent */
		function dayLoadFailed(event, key) {
			var keys = _(dayCache).chain().keys().sort().value();
			if (keys[0] === key) {
				scope.$emit('endOfDays', -1);
			}
			if (keys[keys.length - 1] === key) {
				scope.$emit('endOfDays', +1);
			}
		}

	}

})(window.angular, window._);
