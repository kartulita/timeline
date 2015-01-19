(function (angular, _, moment) {
	'use strict';

	angular.module('battlesnake.timeline')
		.factory('timelineService', timelineService);

	/*
	 * Use the "timeline" attribute directive to specify the source to use
	 */
	function timelineService() {

		return {
			connect: connect
		};

		function connect(adapter) {
			var source = {
				adapter: adapter,
				cache: {}
			};
			var cache = source.cache;

			return {
				getDay: getDay,
				getCurrent: getCurrent
			};

			function getDay(day) {
				day = moment(day);
				var key = day.format('YYYY-MM-DD');
				/* Check cache */
				if (_(cache).has(key)) {
					return cache[key];
				}
				/* Get from backend */
				return adapter.getDay(day)
					.then(cacheData)
					.catch(cacheNothing);

				function cacheData(data) {
					cache[key] = data;
					return data;
				}

				function cacheNothing() {
					cache[key] = [];
					return [];
				}
			}

			function getCurrent() {
				var now = moment();
				return _.find(
					[].concat.apply([], _(cache).values())
						.sort(function (a, b) {
							return b.start.unix() - a.start.unix();
						}),
					function (item) {
						return item.start.isBefore(now);
					}
				);
			}
		}
	}

})(window.angular, window._, window.moment);
