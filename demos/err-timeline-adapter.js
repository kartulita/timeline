(function (angular) {
	'use strict';

	/*
	 * The API endpoint takes the following format:
	 *
	 * GET endpoint?year=YYYY&month=MM&day=DD
	 *
	 * The server responds with an array of items (shows) which are then
	 * transformed by the mapItem function.
	 *
	 * i.e: items = httpGet(endpoint?year=YYYY&month=MM&day=DD).map(mapItem)
	 *
	 * Demo'ing this requires your browser to have CORS checks disabled unless
	 * you run it from the live domain.
	 *
	 * For chrome/chromium: --disable-web-security
	 */
	angular.module('demo')
		.factory('ERRTimelineAdapterFactory', ERRTimelineAdapterFactory);

	function ERRTimelineAdapterFactory() {

		return getAdapter;
		
		function getAdapter(endpoint) {
			return {
				/* URL to get timeline items per day */
				endpoint: endpoint + '/GetTimelineDay',
				/* Applied to each retrieved item to map it to the view's format */
				mapItem: mapItem
			};
		}

		function mapItem(item) {
			return {
				/* Unique ID of item */
				id: item.Id,
				/* Title of item */
				title: item.HeaderLong || item.Header,
				/* Start time */
				start: moment(item.Published),
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

})(window.angular);
