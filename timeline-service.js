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
				cache: {},
				loading: {}
			};
			var cache = source.cache;
			var loading = source.loading;

			return {
				getDay: getDay,
				getCurrent: getCurrent
			};

			function getDay(day) {
				day = moment(day);
				var key = day.format('YYYY-MM-DD');
				/* Check cache */
				if ((adapter.canCache && adapter.canCache(key)) && _(cache).has(key)) {
					return cache[key];
				}
				/* See if data is loading already */
				if (_(loading).has(key)) {
					return loading[key];
				}
				/* Get from backend */
				return loading[key] = adapter.getDay(day)
					.then(dataLoaded)
					.then(cacheData)
					.catch(cacheNothing);

				function dataLoaded(data) {
					delete loading[key];
					return data;
				}

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
