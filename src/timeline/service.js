(function (angular, _, moment) {
	'use strict';

	angular.module('err.timeline')
		.factory('showsService', showsService);

	var mock = [
		{ id: 1, title: 'Terevisioon', start: moment().subtract(1, 'hours') },
		{ id: 2, title: 'Spooks', start: moment().subtract(1, 'minutes') },
		{ id: 3, title: 'Suur Arbuus', start: moment().add(1, 'hours') }
	];

	for (var id = 4; id < 50; id++) {
		mock.push(
			{ id: id, title: 'Future show #' + id, start: moment().add(id, 'hours') });
	}
	for (var id = -30; id < 0; id++) {
		mock.push(
			{ id: id, title: 'Past show #' + -id, start: moment().subtract(id + 1, 'hours') });
	}

	function showsService($http, $q) {
		return {
			getDay: getDay,
			getCurrent: getCurrent
		};

		function getDay(day) {
			return $q.when(mock);
		}

		function getCurrent() {
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
