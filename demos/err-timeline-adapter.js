(function (angular, moment, _) {
	'use strict';

	/*
	 * The API endpoint takes the following format:
	 *
	 * GET endpoint?year=YYYY&month=MM&day=DD
	 *
	 * Demo'ing this requires your browser to have CORS checks disabled unless
	 * you run it from the live domain.
	 *
	 * For chrome/chromium: --disable-web-security
	 */
	angular.module('demo')
		.factory('ERRTimelineAdapterFactory', ERRTimelineAdapterFactory);

	function ERRTimelineAdapterFactory($http) {

		return getAdapter;
		
		function getAdapter(api) {
			var result = {
				/* URL to get timeline items per day */
				endpoint: api + '/loader/GetTimelineDay',
				/* Get contents of a day */
				getDay: getDay,
			};
			return result;

			function getDay(day) {
				day = moment(day);
				var request = {
					method: 'GET',
					url: result.endpoint,
					params: {
						year: day.format('YYYY'),
						month: day.format('MM'),
						day: day.format('DD')
					}
				};
				return $http(request)
					.then(transformData);

				function transformData(res) {
					return _(res.data).map(mapItem);
				}
			}
		}

		function mapItem(item) {
			return {
				/* Unique ID of item */
				id: item.Id,
				/* Title of item */
				title: item.HeaderLong || item.Header,
				/* Start time */
				start: moment(item.Published).local(),
				/* Address of image to display in timeline */
				thumbnail: getThumbnailUrl(item),
				/* Address of larger image (not used yet) */
				image: getImageUrl(item),
				/* Store original item data for viewer */
				itemData: item,
				/* Item can be played */
				playable: item.hasAudio || item.hasVideo
			};

			function getThumbnailUrl(item) {
				return 'http://static.err.ee/gridfs/' + item.Image +
					'?width=360&height=360&mode=crop&quality=25';
			}

			function getImageUrl(item) {
				return 'http://static.err.ee/gridfs/' + item.Image +
					'?width=750&height=750&mode=crop&quality=75';
			}
		}
	}

})(window.angular, window.moment, window._);
