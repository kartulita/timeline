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

			_(adapter.preloaded).each(function (datum) {
				cacheData(getKey(datum.date), datum.data);
			});

			return {
				getGroup: getGroup,
				getCurrent: getCurrent
			};

			function getGroup(date) {
				date = moment(date);
				var key = getKey(date);
				/* Check cache */
				if ((adapter.canCache && adapter.canCache(key)) && _(cache).has(key)) {
					return cache[key];
				}
				/* See if data is loading already */
				if (_(loading).has(key)) {
					return loading[key];
				}
				/* Get from backend */
				return loading[key] = adapter.getGroup(date)
					.then(dataLoaded)
					.then(function (data) { return cacheData(key, data); })
					.catch(function () { return cacheData(key, []); });

				function dataLoaded(data) {
					delete loading[key];
					return data;
				}
			}
			
			function getKey(date) {
				return moment(date).format('YYYY-MM-DD HH:mm:ss');
			}

			function cacheData(key, data) {
				cache[key] = data;
				return data;
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
