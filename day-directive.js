(function (angular, _, moment) {
	'use strict';

	angular.module('battlesnake.timeline')
		.directive('timelineDay', timelineDayDirective);

	function timelineDayDirective($parse, $q, showsService) {

		var itemsParser = /^\s*(\S+?)\s+in\s+(.*?)\s*$/;

		return {
			restrict: 'A',
			transclude: true,
			scope: true,
			link: link
		};

		function link(scope, element, attrs, ctrl, transclude) {

			var api = showsService(scope.source);

			scope.$watch(attrs.day, reloadDay);

			var matches = attrs.timelineDay.match(itemsParser);
			if (!matches) {
				throw new Error('timeline-day expression is not in the form of "<name> in <collection>"');
			}
			var local = matches[1];
			var source = matches[2];
			scope.$watch(source, reloadDay);

			var itemScope;
			return;

			function reloadDay() {
				var day = moment($parse(source)(scope)).clone().local().startOf('day');
				scope.$emit('loading');
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
				$q.all(days.map(api.getDay))
					.then(transformDays)
					.then(storeToScope)
					.finally(emitLoadedEvent);

				function emitLoadedEvent() {
					scope.$emit('loaded', element);
				}

				function transformDays(data) {
					return _([].concat.apply([], data))
						.filter(isToday);

					function isToday(item) {
						return moment(item.start).local().startOf('day')
							.toDate().getTime() === day.toDate().getTime();
					}
				}

				function storeToScope(data) {
					var first = !itemScope;
					if (first) {
						itemScope = scope.$new();
					}
					itemScope[local] = data;
					if (first) {
						transclude(itemScope, function (clone, scope) {
							element.append(clone);
						});
					}
				}
			}
		}
	}

})(window.angular, window._, window.moment);
