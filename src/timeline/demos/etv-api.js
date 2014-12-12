(function (angular) {
	'use strict';

	/*
	 * Define a *TimelineAPI factory in your application then tell the timeline
	 * to use it by setting the value of the timeline attribute to *.
	 *
	 * The API endpoint takes the following format:
	 *
	 * GET endpoint?year=YYYY&month=MM&day=DD
	 *
	 * It responds with an array of items (shows) which are then transformed
	 * by the mapItem function.
	 *
	 * Demo'ing this requires your browser to have CORS checks disabled unless
	 * you run it from the live domain.
	 *
	 * For chrome/chromium: --disable-web-security
	 */
	angular.module('demo')
		.factory('ETVTimelineAPI', ETVTimelineAPI);

	function ETVTimelineAPI() {

		return {
			/* URL to get timeline items per day */
			endpoint: 'http://etv.err.ee/api/loader/GetTimelineDay',
			/* Applied to each retrieved item to map it to the view's format */
			mapItem: mapItem
		};

		function mapItem(item) {

			return {
				id: item.Id,
				title: item.HeaderLong,
				start: moment(item.Published),
				thumbnail: getThumbnailUrl(item),
				image: getImageUrl(item)
			};

			function getThumbnailUrl(item) {
				return 'http://static.err.ee/gridfs/' + item.Image +
					'?width=300&height=300&mode=crop&quality=25';
			}

			function getImageUrl(item) {
				return 'http://static.err.ee/gridfs/' + item.Image +
					'?width=600&height=600&mode=crop&quality=75';
			}
		}
	}

})(window.angular);
