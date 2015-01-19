(function (angular, _) {
	'use strict';

	angular.module('battlesnake.timeline')
		.directive('timelineDays', timelineDaysDirective);

	function timelineDaysDirective($parse) {

		var itemsParser = /^\s*(\S+?)\s+in\s+(.*?)\s*$/;

		return {
			restrict: 'A',
			priority: 10,
			require: '^timeline',
			transclude: true,
			scope: true,
			link: link
		};

		function link(scope, element, attrs, controller, transclude) {
			/* Parse days specification */
			var matches = attrs.timelineDays.match(itemsParser);
			if (!matches) {
				throw new Error('timeline-days expression is not in the form of "<name> in <collection>"');
			}
			var local = matches[1];
			var source = matches[2];
			scope.$watchCollection(source, updateDays);
			scope.$on('modelReset', clearCache);
			scope.$on('dayLoadFailed', dayLoadFailed);

			var daysElements = {};

			return;

			function clearCache() {
				_(daysElements).each(function (line, key) {
					delete daysElements[key];
					line.element.remove();
					line.scope.$destroy();
				});
			}

			function dayLoadFailed(event, key) {
				var keys = _(daysElements).chain().keys().sort().value();
				if (keys[0] === key) {
					scope.$emit('endOfDays', -1);
				}
				if (keys[keys.length - 1] === key) {
					scope.$emit('endOfDays', +1);
				}
			}

			function updateDays() {
				/* Update elements */
				var days = $parse(source)(scope);
				_(days).each(createDayElement);
			}

			/* Find the elements that a day should be inserted between */
			function findDayElementPosition(day) {
				var ticks = day.toDate().getTime();
				var res = _(daysElements)
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

			function createDayElement(day) {
				var key = dayToKey(day);
				var cacheLine;
				if (_(daysElements).has(key)) {
					return;
				} else {
					cacheLine = {
						serial: day.toDate().getTime(),
						generation: scope.model.resetCount,
						element: null,
						scope: null
					};
					daysElements[key] = cacheLine;
				}
				var itemScope = scope.$new();
				itemScope[local] = day.clone();
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

			function dayToKey(day) {
				return day.format('YYYY-MM-DD');
			}
		}
	}

})(window.angular, window._);
