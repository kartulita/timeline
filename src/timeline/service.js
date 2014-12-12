(function (angular, _, moment) {
	'use strict';

	angular.module('err.timeline')
		.factory('showsService', showsService);

	var mock = [
		{ id: 0, title: 'Søørømøø', start: moment().subtract(45, 'minutes') },
		{ id: 1, title: 'Terevisioon', start: moment().subtract(30, 'minutes') },
		{ id: 2, title: 'Spooks', start: moment().subtract(15, 'minutes') },
		{ id: 3, title: 'Suur Arbuus', start: moment().add(15, 'minutes') }
	];

	for (var id = 4; id < 50; id++) {
		mock.push(
			{ id: id, title: 'Future show #' + id, start: moment().add(id, 'hours') });
	}
	for (var id = -10; id < 0; id++) {
		mock.push(
			{ id: id, title: 'Past show #' + -id, start: moment().subtract(-id + 1, 'hours') });
	}

	mock = _(mock).sortBy('start');

	function showsService($http, $q) {
		return {
			getDay: getDay,
			getCurrent: getCurrent
		};

		function getDay(day) {
			return $q.when(mock);
		}

		function getCurrent() {
			/* Assumes data is in ascending order by start time */
			return _(mock)
				.reduceRight(function (memo, item) {
					if (memo !== undefined) {
						return memo;
					} else if (item.start.isBefore(moment())) {
						return item;
					} else {
						return undefined;
					}
				}, undefined);
		}
	}

})(window.angular, window._, window.moment);
