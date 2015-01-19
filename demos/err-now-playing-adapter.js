(function (angular) {
	'use strict';

	angular.module('demo')
		.service('ERRNowPlayingAdapter', ERRNowPlayingAdapter);

	function ERRNowPlayingAdapter($http) {
		return getNowPlaying;
		
		function getNowPlaying(endpoint, channel) {
			endpoint = endpoint + '/radio/GetContent?type=' + encodeURIComponent(channel);
			return function () {
				return $http.get(endpoint);
			};
		}
	}

})(window.angular);
