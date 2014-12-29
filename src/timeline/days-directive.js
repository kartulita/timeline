(function (angular, _) {
	'use strict';
	
	angular.module('battlesnake.timeline')		
		.directive('timelineDays', timelineDaysDirective);

	function timelineDaysDirective($parse) {

		var itemsParser = /^\s*(\S+?)\s+in\s+(.*?)\s*$/;

		return {
			restrict: 'A',
			transclude: true,
			scope: true,
			link: link
		};

		function link(scope, element, attrs, ctrl, transclude) {
			/* Parse days specification */
			var matches = attrs.timelineDays.match(itemsParser);
			if (!matches) {
				throw new Error('timeline-day expression is not in the form of "<name> in <collection>"');
			}
			var local = matches[1];
			var source = matches[2];
			scope.$watchCollection(source, updateDays);

			var daysElements = {};

			return;

			function updateDays() {
				var days = $parse(source)(scope);
				_(days).each(createDayElement);
			}

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
						element: null
					};
					daysElements[key] = cacheLine;
				}
				var itemScope = scope.$new();
				itemScope[local] = day.clone();
				transclude(itemScope, function (clone, scope) {
					cacheLine.element = clone;
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
