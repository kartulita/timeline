(function (angular, _, moment) {
	'use strict';

	angular.module('battlesnake.timeline')
		.factory('showsService', showsService);

	/*
	 * Use the "timeline" attribute directive to specify the source to use
	 * Example source in demos/etv-api.js
	 */
	function showsService($http, $q, $injector) {

		var sources = {};

		return getSource;
		
		function getSource(name) {
			if (!_(sources).has(name)) {
				var api = $injector.get(name + 'TimelineAPI');
				sources[name] = {
					api: api,
					cache: {}
				};
			}

			var source = sources[name];
			var api = source.api;
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
				return $http(
					{
						method: 'GET',
						url: api.endpoint,
						params: {
							year: day.format('YYYY'),
							month: day.format('MM'),
							day: day.format('DD')
						}
					})
					.then(transformData)
					.then(cacheData);
				
				function transformData(res) {
					return _(res.data).map(api.mapItem);
				}

				function cacheData(data) {
					cache[key] = data;
					return data;
				}
			}

			function getCurrent() {
				/* Assumes data is in ascending order by start time */
				var now = moment();
				return _(cache).first(function (day) {
					return _(day).first(function (item) {
						return item.start.isBefore(now);
					});
				});
			}
		}
	}

})(window.angular, window._, window.moment);
