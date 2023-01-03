import wpcom from 'calypso/lib/wp';
import {
	EMAIL_STATS_RECEIVE,
	EMAIL_STATS_REQUEST,
	EMAIL_STATS_REQUEST_FAILURE,
	EMAIL_STATS_REQUEST_SUCCESS,
} from 'calypso/state/action-types';
import { parseEmailChartData, parseEmailCountriesData } from 'calypso/state/stats/lists/utils';

import 'calypso/state/stats/init';

/**
 * Returns an action object to be used in signalling that email stat for a site,
 * email and stat have been received.
 *
 * @param  {number} siteId Site ID
 * @param  {number} postId Email Id
 * @param  {string} period Unit for each element of the returned array (ie: 'year', 'month', ...)
 * @param  {string} statType The type of stat we are working with. For example: 'opens' for Email Open stats
 * @param  {Array}  stats  The received stats
 * @returns {object}        Action object
 */
export function receiveEmailStats( siteId, postId, period, statType, stats ) {
	return {
		type: EMAIL_STATS_RECEIVE,
		siteId,
		postId,
		period,
		statType,
		stats,
	};
}

/**
 * Returns an action thunk which, when invoked, triggers a network request to
 * retrieve email stat for a site and a post.
 *
 * @param  {number} siteId Site ID
 * @param  {number} postId Email Id
 * @param  {string} period Unit for each element of the returned array (ie: 'year', 'month', ...)
 * @param  {string} date A date in YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss format
 * @param  {string} statType The type of stat we are working with. For example: 'opens' for Email Open stats
 * @param  {number} quantity The number of elements retrieved in the array
 */
export function requestEmailStats( siteId, postId, period, date, statType, quantity = 30 ) {
	return ( dispatch ) => {
		dispatch( {
			type: EMAIL_STATS_REQUEST,
			postId,
			siteId,
			period,
			statType,
		} );

		return wpcom
			.site( siteId )
			.statsEmailOpens( postId, { period, quantity, date } )
			.then( ( stats ) => {
				const emailChartData = parseEmailChartData( stats.timeline, [] );
				const emailStats = emailChartData.map( ( item ) => {
					return {
						...item,
						countries: parseEmailCountriesData(
							stats.countries[ item.period ],
							stats[ 'countries-info' ]
						),
					};
				} );

				dispatch( receiveEmailStats( siteId, postId, period, statType, emailStats ) );
				dispatch( {
					type: EMAIL_STATS_REQUEST_SUCCESS,
					siteId,
					postId,
				} );
			} )
			.catch( ( error ) => {
				dispatch( {
					type: EMAIL_STATS_REQUEST_FAILURE,
					siteId,
					postId,
					period,
					statType,
					error,
				} );
			} );
	};
}
